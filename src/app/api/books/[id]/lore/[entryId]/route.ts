import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

type Params = { params: { id: string; entryId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const entry = await queryFirst<{ id: string; data: string }>(
    `SELECT id, data FROM book_state_entries WHERE id = ? AND book_id = ?`,
    [params.entryId, params.id]
  )
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, summary, data } = await req.json()

  let existingData: Record<string, unknown> = {}
  try { existingData = JSON.parse(entry.data) } catch { /* ok */ }

  const mergedData = JSON.stringify({ ...existingData, ...(data ?? {}) })

  await execute(
    `UPDATE book_state_entries
     SET name = COALESCE(?, name),
         summary = ?,
         data = ?,
         updated_at = ?
     WHERE id = ? AND book_id = ?`,
    [
      name?.trim() ?? null,
      summary !== undefined ? (summary?.trim() ?? null) : undefined,
      mergedData,
      Date.now(),
      params.entryId,
      params.id,
    ]
  )

  const updated = await queryFirst(
    `SELECT id, name, summary, type, data FROM book_state_entries WHERE id = ?`,
    [params.entryId]
  )
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: Params) {
  const entry = await queryFirst(
    `SELECT id FROM book_state_entries WHERE id = ? AND book_id = ?`,
    [params.entryId, params.id]
  )
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute(`DELETE FROM book_state_entries WHERE id = ?`, [params.entryId])
  return NextResponse.json({ ok: true })
}
