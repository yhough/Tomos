import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

type Params = { params: { id: string; characterId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const char = await queryFirst(
    `SELECT id FROM characters WHERE id = ? AND book_id = ?`,
    [params.characterId, params.id]
  )
  if (!char) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, description, status, role } = await req.json()

  await execute(
    `UPDATE characters
     SET name        = COALESCE(?, name),
         description = COALESCE(?, description),
         status      = COALESCE(?, status),
         role        = COALESCE(?, role),
         updated_at  = ?
     WHERE id = ? AND book_id = ?`,
    [
      name?.trim() ?? null,
      description?.trim() ?? null,
      status ?? null,
      role ?? null,
      Date.now(),
      params.characterId,
      params.id,
    ]
  )

  const updated = await queryFirst(
    `SELECT id, name, role, description, status, arc_status, data FROM characters WHERE id = ?`,
    [params.characterId]
  )
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: Params) {
  const char = await queryFirst(
    `SELECT id FROM characters WHERE id = ? AND book_id = ?`,
    [params.characterId, params.id]
  )
  if (!char) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute(`DELETE FROM characters WHERE id = ?`, [params.characterId])
  return NextResponse.json({ ok: true })
}
