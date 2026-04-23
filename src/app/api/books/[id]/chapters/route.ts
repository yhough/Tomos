import { queryFirst, queryAll, execute } from '@/db'
import { generateId } from '@/lib/utils'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  return new Anthropic({ apiKey })
}

// Attempt to close a truncated JSON string by balancing brackets/braces.
function balanceJson(s: string): string {
  const stack: ('{' | '[')[] = []
  let inString = false
  let escaped = false

  for (const ch of s) {
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') stack.pop()
  }

  if (inString) s += '"'
  s = s.replace(/,\s*$/, '').replace(/,\s*([}\]])/, '$1')
  for (let i = stack.length - 1; i >= 0; i--) {
    s += stack[i] === '{' ? '}' : ']'
  }
  return s
}

type DbChapter = {
  id: string
  number: number
  title: string
  word_count: number
  summary: string | null
  processing_status: string
  processing_step: string | null
  correction_notes: string
  characters_appearing: string
  created_at: number
}

type DbFlag = {
  id: string
  description: string
  severity: string
  category: string
  resolved: number
  resolved_by: string | null
}

function formatChapter(ch: DbChapter, flags: DbFlag[]) {
  return {
    id: ch.id,
    number: ch.number,
    title: ch.title,
    wordCount: ch.word_count,
    summary: ch.summary,
    processed: ch.processing_status === 'done',
    processingError: ch.processing_status === 'error' ? (ch.processing_step ?? 'Analysis failed') : null,
    createdAt: new Date(ch.created_at),
    flags: flags.map((f) => ({
      id: f.id,
      severity: f.severity as 'error' | 'warning' | 'info',
      category: (f.category ?? 'continuity') as 'continuity' | 'character' | 'narrative',
      description: f.description,
      resolved: f.resolved === 1,
      resolvedBy: f.resolved_by ?? undefined,
    })),
    charactersAppearing: (() => {
      try { return JSON.parse(ch.characters_appearing) as string[] } catch { return [] }
    })(),
    correctionNotes: (() => {
      try {
        return JSON.parse(ch.correction_notes) as Array<{
          id: string; summary: string; appliedAt: string; worldMessageId: string
        }>
      } catch { return [] }
    })(),
  }
}

// ── GET /api/books/[id]/chapters ──────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const chapters = await queryAll<DbChapter>(
    `SELECT id, number, title, word_count, summary, processing_status, processing_step,
            correction_notes, characters_appearing, created_at
     FROM chapters WHERE book_id = ? ORDER BY number ASC`,
    [params.id]
  )

  const result = await Promise.all(
    chapters.map(async (ch) => {
      const flags = await queryAll<DbFlag>(
        `SELECT id, description, severity, category, resolved, resolved_by
         FROM continuity_flags WHERE chapter_id = ? ORDER BY created_at ASC`,
        [ch.id]
      )
      return formatChapter(ch, flags)
    })
  )

  return NextResponse.json(result)
}

// ── POST /api/books/[id]/chapters ─────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { title, number, content } = await req.json() as {
      title: string
      number: number
      content: string
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const book = await queryFirst<{
      id: string; title: string; genre: string; premise: string | null
      protagonist_name: string | null; logline: string | null
    }>(
      'SELECT id, title, genre, premise, protagonist_name, logline FROM books WHERE id = ?',
      [params.id]
    )

    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = Date.now()
    const chapterId = generateId()
    const wordCount = content.trim().split(/\s+/).length

    const existing = await queryFirst<{ id: string }>(
      'SELECT id FROM chapters WHERE book_id = ? AND number = ?',
      [params.id, number]
    )

    if (existing) {
      return NextResponse.json(
        { error: `Chapter ${number} already exists. Delete it first or choose a different number.` },
        { status: 409 }
      )
    }

    await execute(
      `INSERT INTO chapters (id, book_id, number, title, content, word_count,
       processing_status, processing_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'processing', 'Analyzing with AI', ?, ?)`,
      [chapterId, params.id, number, title.trim(), content.trim(), wordCount, now, now]
    )

    const stateEntries = await queryAll<{ type: string; name: string; summary: string | null; data: string }>(
      'SELECT type, name, summary, data FROM book_state_entries WHERE book_id = ? ORDER BY updated_at DESC',
      [params.id]
    )

    const characters = await queryAll<{ name: string; role: string; description: string | null; status: string }>(
      'SELECT name, role, description, status FROM characters WHERE book_id = ? ORDER BY name ASC',
      [params.id]
    )

    const previousChapters = await queryAll<{ number: number; title: string; summary: string | null }>(
      `SELECT number, title, summary FROM chapters
       WHERE book_id = ? AND number < ? AND processing_status = 'done'
       ORDER BY number ASC`,
      [params.id, number]
    )

    const allPreviousContent = await queryAll<{ number: number; title: string; content: string }>(
      `SELECT number, title, content FROM chapters
       WHERE book_id = ? AND id != ? AND content != ''
       ORDER BY number ASC`,
      [params.id, chapterId]
    )

    const prevChapterNumber = number - 1
    const previousExcerpts = allPreviousContent.map((ch) => ({
      number: ch.number,
      title: ch.title,
      opening: firstWords(ch.content, 60),
      closing: lastWords(ch.content, ch.number === prevChapterNumber ? 120 : 40),
    }))

    const systemPrompt = buildChapterSystemPrompt({
      book,
      stateEntries,
      characters,
      previousChapters,
      previousExcerpts,
    })

    const client = getClient()
    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Analyze Chapter ${number}: "${title}"\n\n${content.trim()}` }],
    })

    const wasTruncated = aiResponse.stop_reason === 'max_tokens'
    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    let parsed: ChapterAnalysis = { summary: '', state_updates: [], characters: [], continuity_flags: [], timeline_events: [] }
    let parseOk = false

    try {
      const jsonStr = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? ''
      if (!jsonStr) throw new Error('no JSON block found')
      parsed = JSON.parse(jsonStr) as ChapterAnalysis
      parseOk = !!parsed.summary?.trim()
    } catch {
      if (wasTruncated) {
        try {
          const partial = cleaned.match(/\{[\s\S]*/)?.[0] ?? ''
          parsed = JSON.parse(balanceJson(partial)) as ChapterAnalysis
          parseOk = !!parsed.summary?.trim()
        } catch { /* repair also failed */ }
      }
      if (!parseOk) {
        parsed = { summary: '', state_updates: [], characters: [], continuity_flags: [], timeline_events: [] }
      }
    }

    if (!parseOk) {
      const reason = wasTruncated
        ? 'Chapter too long to analyze in one pass — try splitting it into smaller sections'
        : 'AI response could not be parsed — please try again'
      await execute(
        `UPDATE chapters SET processing_status = 'error', processing_step = ?, updated_at = ? WHERE id = ?`,
        [reason, Date.now(), chapterId]
      )
      return NextResponse.json({ error: reason }, { status: 422 })
    }

    // ── Save results ──────────────────────────────────────────────────────────

    const charSet = new Set<string>()
    for (const c of parsed.characters ?? []) charSet.add(c.name)
    for (const e of parsed.timeline_events ?? []) for (const n of e.characters ?? []) charSet.add(n)
    const charactersAppearing = Array.from(charSet)

    await execute(
      `UPDATE chapters SET summary = ?, processing_status = 'done', processing_step = NULL,
       characters_appearing = ?, updated_at = ? WHERE id = ?`,
      [parsed.summary ?? '', JSON.stringify(charactersAppearing), Date.now(), chapterId]
    )

    // Upsert characters
    for (const c of parsed.characters ?? []) {
      if (!c.name?.trim()) continue
      const existingChar = await queryFirst<{ id: string; data: string }>(
        'SELECT id, data FROM characters WHERE book_id = ? AND name = ?',
        [params.id, c.name]
      )

      if (existingChar) {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(existingChar.data) } catch { /* ok */ }
        if (c.traits?.length) {
          const traitSet = new Set<string>()
          for (const t of (data.traits as string[] | undefined) ?? []) traitSet.add(t)
          for (const t of c.traits) traitSet.add(t)
          data.traits = Array.from(traitSet)
        }
        if (c.notable_moments?.length) {
          data.notable_moments = [...(data.notable_moments as string[] ?? []), ...c.notable_moments]
        }
        await execute(
          `UPDATE characters SET description = COALESCE(?, description),
           status = COALESCE(?, status), data = ?, updated_at = ? WHERE id = ?`,
          [c.description ?? null, c.status ?? null, JSON.stringify(data), Date.now(), existingChar.id]
        )
      } else {
        const newId = generateId()
        const data = JSON.stringify({
          traits: c.traits ?? [],
          relationships: [],
          notable_moments: c.notable_moments ?? [],
          appearances: [chapterId],
        })
        await execute(
          `INSERT INTO characters (id, book_id, name, role, description, status, data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [newId, params.id, c.name, c.role ?? 'minor', c.description ?? '', c.status ?? 'unknown', data, Date.now(), Date.now()]
        )
      }
    }

    // Upsert relationships
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

      const existingRel = await queryFirst<{ id: string }>(
        'SELECT id FROM character_relationships WHERE character_a_id = ? AND character_b_id = ?',
        [aId, bId]
      )

      if (existingRel) {
        await execute(
          `UPDATE character_relationships SET type = ?, description = COALESCE(?, description),
           strength = ?, status = ?, updated_at = ? WHERE id = ?`,
          [type, rel.description ?? null, strength, status, Date.now(), existingRel.id]
        )
      } else {
        await execute(
          `INSERT INTO character_relationships
             (id, book_id, character_a_id, character_b_id, type, description, strength, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateId(), params.id, aId, bId, type, rel.description ?? null, strength, status, Date.now(), Date.now()]
        )
      }
    }

    // Upsert lore entries
    for (const u of parsed.state_updates ?? []) {
      if (!u.name?.trim() || !u.type) continue
      const existingEntry = await queryFirst<{ id: string }>(
        'SELECT id FROM book_state_entries WHERE book_id = ? AND type = ? AND name = ?',
        [params.id, u.type, u.name]
      )

      if (existingEntry) {
        await execute(
          `UPDATE book_state_entries SET summary = ?, data = ?, updated_at = ? WHERE id = ?`,
          [u.summary ?? '', JSON.stringify(u.data ?? {}), Date.now(), existingEntry.id]
        )
      } else {
        await execute(
          `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, source_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'chapter', ?, ?, ?)`,
          [generateId(), params.id, u.type, u.name, u.summary ?? '', JSON.stringify(u.data ?? {}), chapterId, Date.now(), Date.now()]
        )
      }
    }

    // Insert continuity flags
    await execute('DELETE FROM continuity_flags WHERE chapter_id = ?', [chapterId])
    for (const flag of parsed.continuity_flags ?? []) {
      if (!flag.description?.trim()) continue
      await execute(
        `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [generateId(), chapterId, params.id, flag.description, flag.severity ?? 'warning', flag.category ?? 'continuity', Date.now()]
      )
    }

    // Insert timeline events
    for (const event of parsed.timeline_events ?? []) {
      if (!event.title?.trim()) continue
      const maxOrderRow = await queryFirst<{ m: number | null }>(
        'SELECT MAX(sort_order) as m FROM timeline_events WHERE book_id = ?',
        [params.id]
      )
      const maxOrder = maxOrderRow?.m ?? 0

      await execute(
        `INSERT INTO timeline_events
         (id, book_id, title, description, source, source_id, in_story_date, sort_order, created_at, category, characters)
         VALUES (?, ?, ?, ?, 'chapter', ?, ?, ?, ?, 'story', ?)`,
        [generateId(), params.id, event.title, event.description ?? '', chapterId, event.in_story_date ?? null, maxOrder + 1, Date.now(), JSON.stringify(event.characters ?? [])]
      )
    }

    await execute('UPDATE books SET updated_at = ? WHERE id = ?', [Date.now(), params.id])

    const updatedChapter = await queryFirst<DbChapter>(
      `SELECT id, number, title, word_count, summary, processing_status, processing_step,
              correction_notes, characters_appearing, created_at
       FROM chapters WHERE id = ?`,
      [chapterId]
    )

    const flags = await queryAll<DbFlag>(
      `SELECT id, description, severity, category, resolved, resolved_by
       FROM continuity_flags WHERE chapter_id = ? ORDER BY created_at ASC`,
      [chapterId]
    )

    return NextResponse.json(formatChapter(updatedChapter!, flags))
  } catch (err) {
    console.error('[chapters POST] error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    const isApiError = message.includes('credit') || message.includes('API key') || message.includes('authentication')
    return NextResponse.json(
      { error: isApiError ? message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// ── Chapter analysis types ─────────────────────────────────────────────────────

interface ChapterAnalysis {
  summary: string
  characters: Array<{
    name: string
    action: 'create' | 'update'
    role?: string
    status?: string
    description?: string
    traits?: string[]
    notable_moments?: string[]
  }>
  relationship_updates?: Array<{
    character_a: string
    character_b: string
    type: 'ally' | 'enemy' | 'neutral' | 'romantic' | 'family' | 'mentor' | 'rival' | 'unknown'
    description?: string
    strength?: number
    status?: 'active' | 'strained' | 'broken' | 'unknown'
  }>
  state_updates: Array<{
    type: 'world_fact' | 'location' | 'faction' | 'event' | 'misc'
    name: string
    action: 'create' | 'update'
    summary: string
    data: Record<string, unknown>
  }>
  continuity_flags: Array<{
    description: string
    severity: 'error' | 'warning' | 'info'
    category: 'continuity' | 'character' | 'narrative' | 'duplicate'
  }>
  timeline_events: Array<{
    title: string
    description: string
    in_story_date?: string
    characters?: string[]
  }>
}

function buildChapterSystemPrompt(params: {
  book: { title: string; genre: string; premise: string | null; protagonist_name: string | null; logline: string | null }
  stateEntries: Array<{ type: string; name: string; summary: string | null; data: string }>
  characters: Array<{ name: string; role: string; description: string | null; status: string }>
  previousChapters: Array<{ number: number; title: string; summary: string | null }>
  previousExcerpts: Array<{ number: number; title: string; opening: string; closing: string }>
}): string {
  const { book, stateEntries, characters, previousChapters, previousExcerpts } = params

  const charBlock = characters.length > 0
    ? 'KNOWN CHARACTERS:\n' + characters.map((c) =>
        `  - ${c.name} (${c.role}, ${c.status})${c.description ? ': ' + c.description : ''}`
      ).join('\n')
    : ''

  const loreBlock = stateEntries.length > 0
    ? 'ESTABLISHED LORE:\n' + stateEntries.map((e) =>
        `  - [${e.type.toUpperCase()}] ${e.name}${e.summary ? ': ' + e.summary : ''}`
      ).join('\n')
    : ''

  const prevBlock = previousChapters.length > 0
    ? 'PREVIOUS CHAPTERS:\n' + previousChapters.map((c) =>
        `  Ch. ${c.number} — "${c.title}": ${c.summary ?? '(no summary yet)'}`
      ).join('\n')
    : ''

  const excerptBlock = previousExcerpts.length > 0
    ? 'PREVIOUS CHAPTER CONTENT FINGERPRINTS (for duplicate/overlap detection):\n' +
      previousExcerpts.map((e) =>
        `  Ch. ${e.number} — "${e.title}"\n` +
        `    Opening: "${e.opening}"\n` +
        `    Closing: "${e.closing}"`
      ).join('\n')
    : ''

  const context = [charBlock, loreBlock, prevBlock, excerptBlock].filter(Boolean).join('\n\n')

  return `You are Tomos, an AI writing companion. Analyze the provided chapter and return a structured JSON object.

BOOK: ${book.title}
GENRE: ${book.genre}${book.logline ? '\nLOGLINE: ' + book.logline : ''}${book.premise ? '\nPREMISE: ' + book.premise : ''}${book.protagonist_name ? '\nPROTAGONIST: ' + book.protagonist_name : ''}

${context}

Respond ONLY with valid JSON — no markdown fences, no commentary:
{
  "summary": "2–4 sentences covering the chapter's key events and their significance",
  "characters": [{"name":"...","action":"create"|"update","role":"...","status":"...","description":"...","traits":["..."],"notable_moments":["..."]}],
  "relationship_updates": [{"character_a":"...","character_b":"...","type":"ally"|"enemy"|"neutral"|"romantic"|"family"|"mentor"|"rival"|"unknown","description":"...","strength":1-5,"status":"active"|"strained"|"broken"|"unknown"}],
  "state_updates": [{"type":"location"|"faction"|"world_fact"|"event"|"misc","name":"...","action":"create"|"update","summary":"...","data":{}}],
  "continuity_flags": [{"description":"...","severity":"error"|"warning"|"info","category":"continuity"|"character"|"narrative"|"duplicate"}],
  "timeline_events": [{"title":"...","description":"...","in_story_date":null,"characters":["..."]}]
}

Rules:
- Only flag real issues
- Only include characters who actually appear in this chapter
- Keep the summary grounded in what actually happens`
}

function firstWords(text: string, n: number): string {
  return text.trim().split(/\s+/).slice(0, n).join(' ')
}

function lastWords(text: string, n: number): string {
  const words = text.trim().split(/\s+/)
  return words.slice(Math.max(0, words.length - n)).join(' ')
}
