import { queryFirst, queryAll, execute } from '@/db'
import { generateId } from '@/lib/utils'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

function buildSystemPrompt(params: {
  title: string
  genre: string
  premise: string | null
  protagonist_name: string | null
  protagonist_description: string | null
  logline: string | null
  stateEntries: Array<{ type: string; name: string; summary: string | null; data: string }>
  characters: Array<{ name: string; role: string; description: string | null; status: string; data: string }>
}): string {
  const { title, genre, premise, protagonist_name, protagonist_description, logline, stateEntries, characters } = params

  const loreSections: string[] = []

  if (characters.length > 0) {
    loreSections.push('CHARACTERS:\n' + characters.map((c) => {
      const d = (() => { try { return JSON.parse(c.data) } catch { return {} } })()
      const traits = d.traits?.join(', ') || ''
      return `  - ${c.name} (${c.role}, ${c.status})${c.description ? `: ${c.description}` : ''}${traits ? `. Traits: ${traits}` : ''}`
    }).join('\n'))
  }

  const byType: Record<string, typeof stateEntries> = {}
  for (const e of stateEntries) {
    if (!byType[e.type]) byType[e.type] = []
    byType[e.type].push(e)
  }

  const typeLabels: Record<string, string> = {
    world_fact: 'WORLD FACTS', location: 'LOCATIONS', faction: 'FACTIONS', event: 'EVENTS', misc: 'MISC LORE',
  }

  for (const [type, entries] of Object.entries(byType)) {
    loreSections.push(`${typeLabels[type] ?? type.toUpperCase()}:\n` + entries.map((e) => {
      return `  - ${e.name}${e.summary ? `: ${e.summary}` : ''}`
    }).join('\n'))
  }

  const loreBlock = loreSections.length > 0
    ? `\n\n--- ESTABLISHED LORE ---\n${loreSections.join('\n\n')}\n--- END LORE ---`
    : '\n\n(No lore established yet.)'

  return `You are Tomos, an AI writing companion for novelists. You help the writer build a rich, consistent fictional world by tracking lore, reasoning across established facts, and surfacing meaningful consequences.

BOOK: ${title}
GENRE: ${genre}${logline ? `\nLOGLINE: ${logline}` : ''}${premise ? `\nPREMISE: ${premise}` : ''}${protagonist_name ? `\nPROTAGONIST: ${protagonist_name}${protagonist_description ? ` — ${protagonist_description}` : ''}` : ''}${loreBlock}

When the writer narrates an event or establishes a fact:
1. Write a narrative response in the voice of a creative collaborator (2–4 sentences, match the genre's register)
2. Extract structured state updates from the narration
3. Cross-reference against ALL existing lore for contradictions
4. Identify 2–3 logical ripple effects grounded in existing lore

When the writer asks a question:
- Answer using only established lore
- Label any inference or speculation explicitly with "Speculation:"
- Set input_type to "question"

When the writer is making a CORRECTION to previously established canon:
- Detect signals: words like "actually", "correction", "change", "fix", "I meant", "revise"
- Set input_type to "correction"
- Do NOT log any lore updates yet — wait for confirmation
- Write a warm confirmation message summarising the change and asking the writer to approve
- Include a structured correction_data object

ALWAYS respond with valid JSON — no markdown, no commentary, just JSON:
{
  "response": "string",
  "input_type": "fact" | "event" | "question" | "correction",
  "state_updates": [...],
  "relationship_updates": [{"character_a":"...","character_b":"...","type":"ally"|"enemy"|"neutral"|"romantic"|"family"|"mentor"|"rival"|"unknown","description":"...","strength":1-5,"status":"active"|"strained"|"broken"|"unknown"}],
  "ripple_effects": [...],
  "contradictions": [...],
  "timeline_event": {...} | null,
  "correction_data": {...} | null
}`
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { content } = await req.json() as { content: string }
    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const book = await queryFirst<{
      id: string; title: string; genre: string; premise: string | null
      protagonist_name: string | null; protagonist_description: string | null; logline: string | null
    }>('SELECT * FROM books WHERE id = ?', [params.id])

    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const stateEntries = await queryAll<{ type: string; name: string; summary: string | null; data: string }>(
      'SELECT type, name, summary, data FROM book_state_entries WHERE book_id = ? ORDER BY updated_at DESC',
      [params.id]
    )

    const characters = await queryAll<{ name: string; role: string; description: string | null; status: string; data: string }>(
      'SELECT name, role, description, status, data FROM characters WHERE book_id = ? ORDER BY name ASC',
      [params.id]
    )

    const recentMessages = await queryAll<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages
       WHERE book_id = ? AND character_id IS NULL
       ORDER BY created_at DESC LIMIT 20`,
      [params.id]
    )

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const systemPrompt = buildSystemPrompt({ ...book, stateEntries, characters })

    const client = getClient()
    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [...conversationHistory, { role: 'user', content: content.trim() }],
    })

    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}'
    let parsed: {
      response: string
      input_type: string
      state_updates: Array<{ type: string; name: string; action: string; summary: string; data: Record<string, unknown> }>
      relationship_updates?: Array<{ character_a: string; character_b: string; type: string; description?: string; strength?: number; status?: string }>
      ripple_effects: Array<{ title: string; description: string }>
      contradictions: Array<{ description: string; existing: string; resolution_options: string[] }>
      timeline_event?: { title: string; description: string; in_story_date?: string } | null
      correction_data?: Record<string, unknown> | null
    }

    try {
      parsed = JSON.parse(rawText.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    } catch {
      parsed = { response: rawText, input_type: 'fact', state_updates: [], ripple_effects: [], contradictions: [] }
    }

    const now = Date.now()
    const userMsgId = generateId()
    const assistantMsgId = generateId()

    await execute(
      `INSERT INTO chat_messages (id, book_id, character_id, role, content, metadata, created_at)
       VALUES (?, ?, NULL, 'user', ?, '{}', ?)`,
      [userMsgId, params.id, content.trim(), now]
    )

    const hasContradictions = (parsed.contradictions ?? []).length > 0
    const isCorrection = parsed.input_type === 'correction'

    const metadata = isCorrection
      ? JSON.stringify({
          input_type: 'correction',
          is_correction: true,
          correction_status: 'pending_confirmation',
          correction_data: parsed.correction_data ?? null,
          state_updates: [],
          contradictions: [],
        })
      : JSON.stringify({
          input_type: parsed.input_type,
          state_updates: hasContradictions ? [] : (parsed.state_updates ?? []),
          contradictions: parsed.contradictions ?? [],
        })

    if (isCorrection) {
      await execute(
        `INSERT INTO chat_messages (id, book_id, character_id, role, content, metadata, is_correction, correction_status, correction_data, created_at)
         VALUES (?, ?, NULL, 'assistant', ?, ?, 1, 'pending_confirmation', ?, ?)`,
        [assistantMsgId, params.id, parsed.response ?? '', metadata, JSON.stringify(parsed.correction_data ?? {}), now + 1]
      )
    } else {
      await execute(
        `INSERT INTO chat_messages (id, book_id, character_id, role, content, metadata, created_at)
         VALUES (?, ?, NULL, 'assistant', ?, ?, ?)`,
        [assistantMsgId, params.id, parsed.response ?? '', metadata, now + 1]
      )
    }

    let rippleCards: Array<{ id: string; title: string; description: string; status: string }> = []

    if (!hasContradictions && !isCorrection) {
      for (const update of parsed.state_updates ?? []) {
        if (update.type === 'character') {
          const existing = await queryFirst<{ id: string }>(
            'SELECT id FROM characters WHERE book_id = ? AND name = ?',
            [params.id, update.name]
          )
          if (existing) {
            await execute(
              `UPDATE characters SET description = COALESCE(?, description), data = ?, updated_at = ? WHERE id = ?`,
              [update.summary ?? null, JSON.stringify(update.data ?? {}), now, existing.id]
            )
          } else {
            const charId = generateId()
            const role = (update.data?.role as string) ?? 'minor'
            const status = (update.data?.status as string) ?? 'unknown'
            await execute(
              `INSERT INTO characters (id, book_id, name, role, description, status, data, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [charId, params.id, update.name, role, update.summary ?? '', status, JSON.stringify(update.data ?? {}), now, now]
            )
          }
        } else {
          const existing = await queryFirst<{ id: string }>(
            'SELECT id FROM book_state_entries WHERE book_id = ? AND type = ? AND name = ?',
            [params.id, update.type, update.name]
          )
          if (existing) {
            await execute(
              `UPDATE book_state_entries SET summary = ?, data = ?, updated_at = ? WHERE id = ?`,
              [update.summary ?? '', JSON.stringify(update.data ?? {}), now, existing.id]
            )
          } else {
            await execute(
              `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, source_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'chat', ?, ?, ?)`,
              [generateId(), params.id, update.type, update.name, update.summary ?? '', JSON.stringify(update.data ?? {}), assistantMsgId, now, now]
            )
          }
        }
      }

      for (const rel of parsed.relationship_updates ?? []) {
        const charA = await queryFirst<{ id: string }>(
          'SELECT id FROM characters WHERE book_id = ? AND name = ?',
          [params.id, rel.character_a]
        )
        const charB = await queryFirst<{ id: string }>(
          'SELECT id FROM characters WHERE book_id = ? AND name = ?',
          [params.id, rel.character_b]
        )
        if (!charA || !charB || charA.id === charB.id) continue

        const [aId, bId] = [charA.id, charB.id].sort()
        const type = rel.type ?? 'unknown'
        const strength = Math.min(5, Math.max(1, rel.strength ?? 1))
        const status = rel.status ?? 'unknown'

        const existing = await queryFirst<{ id: string }>(
          'SELECT id FROM character_relationships WHERE character_a_id = ? AND character_b_id = ?',
          [aId, bId]
        )

        if (existing) {
          await execute(
            `UPDATE character_relationships SET type = ?, description = COALESCE(?, description),
             strength = ?, status = ?, updated_at = ? WHERE id = ?`,
            [type, rel.description ?? null, strength, status, now, existing.id]
          )
        } else {
          await execute(
            `INSERT INTO character_relationships
               (id, book_id, character_a_id, character_b_id, type, description, strength, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [generateId(), params.id, aId, bId, type, rel.description ?? null, strength, status, now, now]
          )
        }
      }

      if (parsed.timeline_event?.title) {
        const maxOrderRow = await queryFirst<{ m: number | null }>(
          'SELECT MAX(sort_order) as m FROM timeline_events WHERE book_id = ?',
          [params.id]
        )
        const maxOrder = maxOrderRow?.m ?? 0
        await execute(
          `INSERT INTO timeline_events (id, book_id, title, description, source, source_id, in_story_date, sort_order, created_at)
           VALUES (?, ?, ?, ?, 'chat', ?, ?, ?, ?)`,
          [generateId(), params.id, parsed.timeline_event.title, parsed.timeline_event.description ?? '', assistantMsgId, parsed.timeline_event.in_story_date ?? null, maxOrder + 1, now]
        )
      }

      for (const effect of parsed.ripple_effects ?? []) {
        if (!effect.title) continue
        const cardId = generateId()
        await execute(
          `INSERT INTO ripple_cards (id, message_id, book_id, title, description, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [cardId, assistantMsgId, params.id, effect.title, effect.description ?? '', now]
        )
        rippleCards.push({ id: cardId, title: effect.title, description: effect.description ?? '', status: 'pending' })
      }
    }

    await execute('UPDATE books SET updated_at = ? WHERE id = ?', [now, params.id])

    return NextResponse.json({
      message: {
        id: assistantMsgId,
        role: 'assistant',
        content: parsed.response ?? '',
        metadata,
        created_at: now + 1,
        ripple_cards: rippleCards,
      },
      user_message: {
        id: userMsgId,
        role: 'user',
        content: content.trim(),
        metadata: '{}',
        created_at: now,
        ripple_cards: [],
      },
      contradictions: parsed.contradictions ?? [],
    })
  } catch (err) {
    console.error('[world/chat] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    const isApiError = message.includes('credit') || message.includes('API key') || message.includes('authentication')
    return NextResponse.json(
      { error: isApiError ? message : 'Internal server error' },
      { status: 500 }
    )
  }
}
