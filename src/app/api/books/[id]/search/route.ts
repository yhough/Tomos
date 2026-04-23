import { queryAll } from '@/db'
import { NextResponse } from 'next/server'

export type SearchResultType = 'character' | 'location' | 'faction' | 'magic' | 'lore' | 'chapter' | 'timeline'

export interface SearchResult {
  id: string
  type: SearchResultType
  name: string
  snippet: string | null
  meta: string | null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 1) return NextResponse.json([])

  const like = `%${q}%`
  const results: SearchResult[] = []

  const chars = await queryAll<{ id: string; name: string; description: string | null; role: string; status: string; data: string }>(
    `SELECT id, name, description, role, status, data FROM characters WHERE book_id = ?
     AND (name LIKE ? OR description LIKE ? OR data LIKE ?) LIMIT 5`,
    [params.id, like, like, like]
  )

  for (const c of chars) {
    let snippet = c.description
    if (!snippet?.toLowerCase().includes(q.toLowerCase())) {
      try {
        const d = JSON.parse(c.data) as { traits?: string[]; notable_moments?: string[] }
        const hit = [...(d.traits ?? []), ...(d.notable_moments ?? [])].find((t) =>
          t.toLowerCase().includes(q.toLowerCase())
        )
        if (hit) snippet = hit
      } catch { /* ok */ }
    }
    results.push({ id: c.id, type: 'character', name: c.name, snippet, meta: c.role })
  }

  const lore = await queryAll<{ id: string; name: string; summary: string | null; type: string; data: string }>(
    `SELECT id, name, summary, type, data FROM book_state_entries WHERE book_id = ?
     AND (name LIKE ? OR summary LIKE ?) LIMIT 8`,
    [params.id, like, like]
  )

  for (const e of lore) {
    let type: SearchResultType = 'lore'
    if (e.type === 'location') type = 'location'
    else if (e.type === 'faction') type = 'faction'
    else if (e.type === 'misc') {
      try {
        if ((JSON.parse(e.data) as { category?: string }).category === 'magic') type = 'magic'
      } catch { /* ok */ }
    }
    results.push({ id: e.id, type, name: e.name, snippet: e.summary, meta: null })
  }

  const chapters = await queryAll<{ id: string; number: number; title: string; summary: string | null }>(
    `SELECT id, number, title, summary FROM chapters WHERE book_id = ?
     AND (title LIKE ? OR summary LIKE ?) LIMIT 5`,
    [params.id, like, like]
  )

  for (const ch of chapters) {
    results.push({ id: ch.id, type: 'chapter', name: ch.title, snippet: ch.summary, meta: `Ch. ${ch.number}` })
  }

  const timeline = await queryAll<{ id: string; title: string; description: string | null }>(
    `SELECT id, title, description FROM timeline_events WHERE book_id = ?
     AND (title LIKE ? OR description LIKE ?)
     AND (is_correction IS NULL OR is_correction = 0) LIMIT 5`,
    [params.id, like, like]
  )

  for (const e of timeline) {
    results.push({ id: e.id, type: 'timeline', name: e.title, snippet: e.description, meta: null })
  }

  return NextResponse.json(results)
}
