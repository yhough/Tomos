import { db } from '@/db'
import { generateId } from '@/lib/utils'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  // Close any open string
  if (inString) s += '"'

  // Remove a trailing incomplete key or comma before closing
  s = s.replace(/,\s*$/, '').replace(/,\s*([}\]])/, '$1')

  // Close all open structures in reverse order
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
  const chapters = db
    .prepare(
      `SELECT id, number, title, word_count, summary, processing_status, processing_step,
              correction_notes, characters_appearing, created_at
       FROM chapters WHERE book_id = ? ORDER BY number ASC`
    )
    .all(params.id) as DbChapter[]

  const result = chapters.map((ch) => {
    const flags = db
      .prepare(
        `SELECT id, description, severity, category, resolved, resolved_by
         FROM continuity_flags WHERE chapter_id = ? ORDER BY created_at ASC`
      )
      .all(ch.id) as DbFlag[]
    return formatChapter(ch, flags)
  })

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

    const book = db.prepare(
      'SELECT id, title, genre, premise, protagonist_name, logline FROM books WHERE id = ?'
    ).get(params.id) as {
      id: string; title: string; genre: string; premise: string | null
      protagonist_name: string | null; logline: string | null
    } | undefined

    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = Date.now()
    const chapterId = generateId()
    const wordCount = content.trim().split(/\s+/).length

    // Reject duplicate chapter numbers
    const existing = db.prepare(
      'SELECT id FROM chapters WHERE book_id = ? AND number = ?'
    ).get(params.id, number) as { id: string } | undefined

    if (existing) {
      return NextResponse.json(
        { error: `Chapter ${number} already exists. Delete it first or choose a different number.` },
        { status: 409 }
      )
    }

    db.prepare(
      `INSERT INTO chapters (id, book_id, number, title, content, word_count,
       processing_status, processing_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'processing', 'Analyzing with AI', ?, ?)`
    ).run(chapterId, params.id, number, title.trim(), content.trim(), wordCount, now, now)

    const finalChapterId = chapterId

    // Fetch context for the AI
    const stateEntries = db
      .prepare(
        'SELECT type, name, summary, data FROM book_state_entries WHERE book_id = ? ORDER BY updated_at DESC'
      )
      .all(params.id) as Array<{ type: string; name: string; summary: string | null; data: string }>

    const characters = db
      .prepare(
        'SELECT name, role, description, status FROM characters WHERE book_id = ? ORDER BY name ASC'
      )
      .all(params.id) as Array<{ name: string; role: string; description: string | null; status: string }>

    const previousChapters = db
      .prepare(
        `SELECT number, title, summary FROM chapters
         WHERE book_id = ? AND number < ? AND processing_status = 'done'
         ORDER BY number ASC`
      )
      .all(params.id, number) as Array<{ number: number; title: string; summary: string | null }>

    const systemPrompt = buildChapterSystemPrompt({
      book,
      stateEntries,
      characters,
      previousChapters,
    })

    // Call Claude
    const client = getClient()
    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze Chapter ${number}: "${title}"\n\n${content.trim()}`,
        },
      ],
    })

    const wasTruncated = aiResponse.stop_reason === 'max_tokens'
    const rawText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : ''

    // Strip markdown fences in case Claude added them despite instructions
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim()

    let parsed: ChapterAnalysis
    let parseOk = false

    // 1. Try normal parse
    try {
      const jsonStr = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? ''
      if (!jsonStr) throw new Error('no JSON block found')
      parsed = JSON.parse(jsonStr) as ChapterAnalysis
      parseOk = !!parsed.summary?.trim()
    } catch {
      // 2. If truncated, try to balance open brackets and parse again
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
      db.prepare(
        `UPDATE chapters SET processing_status = 'error', processing_step = ?, updated_at = ? WHERE id = ?`
      ).run(reason, Date.now(), finalChapterId)
      return NextResponse.json({ error: reason }, { status: 422 })
    }

    // ── Save results ──────────────────────────────────────────────────────────

    const charSet = new Set<string>()
    for (const c of parsed.characters ?? []) charSet.add(c.name)
    for (const e of parsed.timeline_events ?? []) for (const n of e.characters ?? []) charSet.add(n)
    const charactersAppearing = Array.from(charSet)

    db.prepare(
      `UPDATE chapters SET summary = ?, processing_status = 'done', processing_step = NULL,
       characters_appearing = ?, updated_at = ? WHERE id = ?`
    ).run(
      parsed.summary ?? '',
      JSON.stringify(charactersAppearing),
      Date.now(),
      finalChapterId
    )

    // Upsert characters
    for (const c of parsed.characters ?? []) {
      if (!c.name?.trim()) continue
      const existingChar = db
        .prepare('SELECT id, data FROM characters WHERE book_id = ? AND name = ?')
        .get(params.id, c.name) as { id: string; data: string } | undefined

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
        db.prepare(
          `UPDATE characters SET description = COALESCE(?, description),
           status = COALESCE(?, status), data = ?, updated_at = ? WHERE id = ?`
        ).run(c.description ?? null, c.status ?? null, JSON.stringify(data), Date.now(), existingChar.id)
      } else {
        const newId = generateId()
        const data = JSON.stringify({
          traits: c.traits ?? [],
          relationships: [],
          notable_moments: c.notable_moments ?? [],
          appearances: [finalChapterId],
        })
        db.prepare(
          `INSERT INTO characters (id, book_id, name, role, description, status, data, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          newId, params.id, c.name,
          c.role ?? 'minor',
          c.description ?? '',
          c.status ?? 'unknown',
          data,
          Date.now(), Date.now()
        )
      }
    }

    // Upsert lore / world-state entries
    for (const u of parsed.state_updates ?? []) {
      if (!u.name?.trim() || !u.type) continue
      const existingEntry = db
        .prepare('SELECT id FROM book_state_entries WHERE book_id = ? AND type = ? AND name = ?')
        .get(params.id, u.type, u.name) as { id: string } | undefined

      if (existingEntry) {
        db.prepare(
          `UPDATE book_state_entries SET summary = ?, data = ?, updated_at = ? WHERE id = ?`
        ).run(u.summary ?? '', JSON.stringify(u.data ?? {}), Date.now(), existingEntry.id)
      } else {
        db.prepare(
          `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, source_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'chapter', ?, ?, ?)`
        ).run(
          generateId(), params.id, u.type, u.name,
          u.summary ?? '', JSON.stringify(u.data ?? {}),
          finalChapterId, Date.now(), Date.now()
        )
      }
    }

    // Insert continuity flags (clear old ones for this chapter first)
    db.prepare('DELETE FROM continuity_flags WHERE chapter_id = ?').run(finalChapterId)
    for (const flag of parsed.continuity_flags ?? []) {
      if (!flag.description?.trim()) continue
      db.prepare(
        `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(
        generateId(), finalChapterId, params.id,
        flag.description,
        flag.severity ?? 'warning',
        flag.category ?? 'continuity',
        Date.now()
      )
    }

    // Insert timeline events
    for (const event of parsed.timeline_events ?? []) {
      if (!event.title?.trim()) continue
      const maxOrder = (db
        .prepare('SELECT MAX(sort_order) as m FROM timeline_events WHERE book_id = ?')
        .get(params.id) as { m: number | null })?.m ?? 0

      db.prepare(
        `INSERT INTO timeline_events
         (id, book_id, title, description, source, source_id, in_story_date, sort_order, created_at, category, characters)
         VALUES (?, ?, ?, ?, 'chapter', ?, ?, ?, ?, 'story', ?)`
      ).run(
        generateId(), params.id,
        event.title,
        event.description ?? '',
        finalChapterId,
        event.in_story_date ?? null,
        maxOrder + 1,
        Date.now(),
        JSON.stringify(event.characters ?? [])
      )
    }

    // Bump book updated_at
    db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(Date.now(), params.id)

    // Return the formatted chapter
    const updatedChapter = db.prepare(
      `SELECT id, number, title, word_count, summary, processing_status, processing_step,
              correction_notes, characters_appearing, created_at
       FROM chapters WHERE id = ?`
    ).get(finalChapterId) as DbChapter

    const flags = db
      .prepare(
        `SELECT id, description, severity, category, resolved, resolved_by
         FROM continuity_flags WHERE chapter_id = ? ORDER BY created_at ASC`
      )
      .all(finalChapterId) as DbFlag[]

    return NextResponse.json(formatChapter(updatedChapter, flags))
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
    category: 'continuity' | 'character' | 'narrative'
  }>
  timeline_events: Array<{
    title: string
    description: string
    in_story_date?: string
    characters?: string[]
  }>
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildChapterSystemPrompt(params: {
  book: { title: string; genre: string; premise: string | null; protagonist_name: string | null; logline: string | null }
  stateEntries: Array<{ type: string; name: string; summary: string | null; data: string }>
  characters: Array<{ name: string; role: string; description: string | null; status: string }>
  previousChapters: Array<{ number: number; title: string; summary: string | null }>
}): string {
  const { book, stateEntries, characters, previousChapters } = params

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

  const context = [charBlock, loreBlock, prevBlock].filter(Boolean).join('\n\n')

  return `You are Grimm, an AI writing companion. Analyze the provided chapter and return a structured JSON object.

BOOK: ${book.title}
GENRE: ${book.genre}${book.logline ? '\nLOGLINE: ' + book.logline : ''}${book.premise ? '\nPREMISE: ' + book.premise : ''}${book.protagonist_name ? '\nPROTAGONIST: ' + book.protagonist_name : ''}

${context}

Respond ONLY with valid JSON — no markdown fences, no commentary:
{
  "summary": "2–4 sentences covering the chapter's key events and their significance",
  "characters": [
    {
      "name": "exact name as used in chapter",
      "action": "create" | "update",
      "role": "protagonist" | "antagonist" | "supporting" | "minor",
      "status": "alive" | "dead" | "unknown" | "ambiguous",
      "description": "updated one-line description based on what we know after this chapter",
      "traits": ["trait1"],
      "notable_moments": ["what happened to them in this chapter"]
    }
  ],
  "state_updates": [
    {
      "type": "location" | "faction" | "world_fact" | "event" | "misc",
      "name": "entity name",
      "action": "create" | "update",
      "summary": "brief description",
      "data": {}
    }
  ],
  "continuity_flags": [
    {
      "description": "clear description of the issue",
      "severity": "error" | "warning" | "info",
      "category": "continuity" | "character" | "narrative"
    }
  ],
  "timeline_events": [
    {
      "title": "short event title",
      "description": "1–2 sentence description of what happened",
      "in_story_date": "in-universe date if mentioned, else null",
      "characters": ["Character Name"]
    }
  ]
}

Rules:
- continuity_flags severity: "error" = direct contradiction with established facts; "warning" = possible inconsistency or notable concern; "info" = minor observation
- continuity_flags category: "continuity" = factual contradiction (wrong location, impossible timeline, dead character reappears, etc.); "character" = character acts against their established personality, motivation, or arc; "narrative" = unexplained gap in logic, missing cause-and-effect, pacing issue, or plot hole
- Only flag real issues — don't invent problems
- Only include characters who actually appear in this chapter
- Only include state_updates for newly established facts or significant updates
- Keep the summary grounded in what actually happens in the chapter`
}
