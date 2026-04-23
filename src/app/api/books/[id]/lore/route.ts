import { queryFirst, queryAll, execute } from '@/db'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'

const VALID_TYPES = ['world_fact', 'location', 'faction', 'event', 'misc'] as const
type DbType = typeof VALID_TYPES[number]

function categoryToType(category: string): { type: DbType; dataExtra?: Record<string, string> } {
  if (category === 'location') return { type: 'location' }
  if (category === 'faction')  return { type: 'faction' }
  if (category === 'magic')    return { type: 'misc', dataExtra: { category: 'magic' } }
  return { type: 'misc' }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst('SELECT id FROM books WHERE id = ?', [params.id])
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { category, name, summary, data } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const { type, dataExtra } = categoryToType(category ?? 'misc')
  const merged = JSON.stringify({ ...(data ?? {}), ...(dataExtra ?? {}) })
  const id = nanoid()
  const now = Date.now()

  await execute(
    `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'chat', ?, ?)`,
    [id, params.id, type, name.trim(), summary?.trim() ?? null, merged, now, now]
  )

  const entry = await queryFirst(
    `SELECT id, name, summary, type, data FROM book_state_entries WHERE id = ?`,
    [id]
  )
  return NextResponse.json(entry, { status: 201 })
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst<{ logline: string | null }>(
    'SELECT logline FROM books WHERE id = ?',
    [params.id]
  )
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const characters = (
    await queryAll<{ id: string; name: string; summary: string | null; status: string; data: string }>(
      'SELECT id, name, description AS summary, status, data FROM characters WHERE book_id = ? ORDER BY name ASC',
      [params.id]
    )
  ).map((r) => ({ ...r, category: 'character' as const }))

  const stateEntries = await queryAll<{ id: string; name: string; summary: string | null; type: string; data: string }>(
    'SELECT id, name, summary, type, data FROM book_state_entries WHERE book_id = ? ORDER BY name ASC',
    [params.id]
  )

  const factions  = stateEntries.filter((e) => e.type === 'faction').map((e) => ({ ...e, category: 'faction' as const }))
  const locations = stateEntries.filter((e) => e.type === 'location').map((e) => ({ ...e, category: 'location' as const }))
  const magic     = stateEntries.filter((e) => {
    if (e.type !== 'misc') return false
    try { const d = JSON.parse(e.data); return d.category === 'magic' } catch { return false }
  }).map((e) => ({ ...e, category: 'magic' as const }))
  const misc = stateEntries.filter((e) => {
    if (e.type === 'faction' || e.type === 'location') return false
    if (e.type === 'misc') {
      try { const d = JSON.parse(e.data); if (d.category === 'magic') return false } catch { /* ok */ }
    }
    return true
  }).map((e) => ({ ...e, category: 'misc' as const }))

  return NextResponse.json({
    logline: book.logline,
    sections: { characters, factions, locations, magic, misc },
  })
}
