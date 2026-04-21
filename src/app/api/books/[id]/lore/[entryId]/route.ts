import { db } from '@/db'
import { NextResponse } from 'next/server'

type Params = { params: { id: string; entryId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const entry = db.prepare(`SELECT * FROM book_state_entries WHERE id = ? AND book_id = ?`)
    .get(params.entryId, params.id) as { id: string; data: string } | undefined
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, summary, data } = await req.json()

  let existingData: Record<string, unknown> = {}
  try { existingData = JSON.parse(entry.data) } catch { /* ok */ }

  const mergedData = JSON.stringify({ ...existingData, ...(data ?? {}) })

  db.prepare(`
    UPDATE book_state_entries
    SET name = COALESCE(?, name),
        summary = ?,
        data = ?,
        updated_at = ?
    WHERE id = ? AND book_id = ?
  `).run(
    name?.trim() ?? null,
    summary !== undefined ? (summary?.trim() ?? null) : undefined,
    mergedData,
    Date.now(),
    params.entryId,
    params.id,
  )

  const updated = db.prepare(`SELECT id, name, summary, type, data FROM book_state_entries WHERE id = ?`)
    .get(params.entryId)
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: Params) {
  const entry = db.prepare(`SELECT id FROM book_state_entries WHERE id = ? AND book_id = ?`)
    .get(params.entryId, params.id)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.prepare(`DELETE FROM book_state_entries WHERE id = ?`).run(params.entryId)
  return NextResponse.json({ ok: true })
}
