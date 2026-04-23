import { db } from '@/db'
import { NextResponse } from 'next/server'

function safeJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = db
    .prepare('SELECT title, genre, premise, logline, protagonist_name FROM books WHERE id = ?')
    .get(params.id) as {
      title: string
      genre: string
      premise: string | null
      logline: string | null
      protagonist_name: string | null
    } | undefined

  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const characters = (
    db
      .prepare(
        `SELECT name, role, description, status, arc_status, data FROM characters
         WHERE book_id = ?
         ORDER BY CASE role
           WHEN 'protagonist' THEN 0 WHEN 'antagonist' THEN 1 WHEN 'supporting' THEN 2 ELSE 3
         END, name ASC`
      )
      .all(params.id) as Array<{
        name: string; role: string; description: string | null
        status: string; arc_status: string | null; data: string
      }>
  ).map((c) => ({ ...c, data: safeJson<Record<string, unknown>>(c.data, {}) }))

  const relationships = db
    .prepare(
      `SELECT cr.type, cr.description, cr.strength, cr.status,
              ca.name AS character_a_name, cb.name AS character_b_name
       FROM character_relationships cr
       JOIN characters ca ON ca.id = cr.character_a_id
       JOIN characters cb ON cb.id = cr.character_b_id
       WHERE cr.book_id = ? ORDER BY cr.strength DESC`
    )
    .all(params.id) as Array<{
      type: string; description: string | null; strength: number; status: string
      character_a_name: string; character_b_name: string
    }>

  const loreEntries = db
    .prepare('SELECT type, name, summary, data FROM book_state_entries WHERE book_id = ? ORDER BY name ASC')
    .all(params.id) as Array<{ type: string; name: string; summary: string | null; data: string }>

  const chapters = (
    db
      .prepare(
        `SELECT number, title, summary, word_count, characters_appearing
         FROM chapters WHERE book_id = ? AND processing_status = 'done'
         ORDER BY number ASC`
      )
      .all(params.id) as Array<{
        number: number; title: string; summary: string | null
        word_count: number; characters_appearing: string
      }>
  ).map((c) => ({ ...c, characters_appearing: safeJson<string[]>(c.characters_appearing, []) }))

  const timeline = (
    db
      .prepare(
        `SELECT title, description, category, characters, in_story_date
         FROM timeline_events
         WHERE book_id = ? AND (is_correction IS NULL OR is_correction = 0)
         ORDER BY sort_order ASC, created_at ASC`
      )
      .all(params.id) as Array<{
        title: string; description: string | null; category: string | null
        characters: string; in_story_date: string | null
      }>
  ).map((e) => ({ ...e, characters: safeJson<string[]>(e.characters, []) }))

  const locations = loreEntries.filter((e) => e.type === 'location')
  const factions = loreEntries.filter((e) => e.type === 'faction')
  const magic = loreEntries.filter((e) => {
    if (e.type !== 'misc') return false
    try { return (JSON.parse(e.data) as { category?: string }).category === 'magic' } catch { return false }
  })
  const worldLore = loreEntries.filter((e) => {
    if (e.type === 'location' || e.type === 'faction') return false
    if (e.type === 'misc') {
      try { if ((JSON.parse(e.data) as { category?: string }).category === 'magic') return false } catch { /* ok */ }
    }
    return true
  })

  return NextResponse.json({
    book,
    characters,
    relationships,
    lore: { locations, factions, magic, worldLore },
    chapters,
    timeline,
  })
}
