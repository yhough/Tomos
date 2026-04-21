import { db } from '@/db'
import { NextResponse } from 'next/server'

type Params = { params: { id: string; characterId: string } }

export async function PATCH(req: Request, { params }: Params) {
  const char = db.prepare(`SELECT id FROM characters WHERE id = ? AND book_id = ?`)
    .get(params.characterId, params.id)
  if (!char) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, description, status, role } = await req.json()

  db.prepare(`
    UPDATE characters
    SET name        = COALESCE(?, name),
        description = COALESCE(?, description),
        status      = COALESCE(?, status),
        role        = COALESCE(?, role),
        updated_at  = ?
    WHERE id = ? AND book_id = ?
  `).run(
    name?.trim() ?? null,
    description?.trim() ?? null,
    status ?? null,
    role ?? null,
    Date.now(),
    params.characterId,
    params.id,
  )

  const updated = db.prepare(`SELECT id, name, role, description, status, arc_status, data FROM characters WHERE id = ?`)
    .get(params.characterId)
  return NextResponse.json(updated)
}

export async function DELETE(_: Request, { params }: Params) {
  const char = db.prepare(`SELECT id FROM characters WHERE id = ? AND book_id = ?`)
    .get(params.characterId, params.id)
  if (!char) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.prepare(`DELETE FROM characters WHERE id = ?`).run(params.characterId)
  return NextResponse.json({ ok: true })
}
