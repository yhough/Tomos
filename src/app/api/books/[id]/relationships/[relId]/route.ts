import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; relId: string } }
) {
  try {
    const body = await req.json() as {
      type?: string
      description?: string
      strength?: number
      status?: string
    }

    const existing = db
      .prepare('SELECT id FROM character_relationships WHERE id = ? AND book_id = ?')
      .get(params.relId, params.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fields: string[] = []
    const values: unknown[] = []

    if (body.type !== undefined) { fields.push('type = ?'); values.push(body.type) }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description) }
    if (body.strength !== undefined) {
      fields.push('strength = ?')
      values.push(Math.min(5, Math.max(1, body.strength)))
    }
    if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status) }

    if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(params.relId)

    db.prepare(`UPDATE character_relationships SET ${fields.join(', ')} WHERE id = ?`).run(...values)

    const row = db
      .prepare(
        `SELECT cr.*,
                ca.name as character_a_name, ca.role as character_a_role,
                cb.name as character_b_name, cb.role as character_b_role
         FROM character_relationships cr
         JOIN characters ca ON ca.id = cr.character_a_id
         JOIN characters cb ON cb.id = cr.character_b_id
         WHERE cr.id = ?`
      )
      .get(params.relId)

    return NextResponse.json(row)
  } catch (err) {
    console.error('[relationship PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; relId: string } }
) {
  try {
    const existing = db
      .prepare('SELECT id FROM character_relationships WHERE id = ? AND book_id = ?')
      .get(params.relId, params.id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    db.prepare('DELETE FROM character_relationships WHERE id = ?').run(params.relId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[relationship DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
