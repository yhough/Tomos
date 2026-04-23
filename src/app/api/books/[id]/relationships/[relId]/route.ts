import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'
import type { Args } from '@/db'

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

    const existing = await queryFirst(
      'SELECT id FROM character_relationships WHERE id = ? AND book_id = ?',
      [params.relId, params.id]
    )
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const fields: string[] = []
    const values: Args = []

    if (body.type !== undefined) { fields.push('type = ?'); (values as unknown[]).push(body.type) }
    if (body.description !== undefined) { fields.push('description = ?'); (values as unknown[]).push(body.description) }
    if (body.strength !== undefined) {
      fields.push('strength = ?')
      ;(values as unknown[]).push(Math.min(5, Math.max(1, body.strength)))
    }
    if (body.status !== undefined) { fields.push('status = ?'); (values as unknown[]).push(body.status) }

    if (fields.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    fields.push('updated_at = ?')
    ;(values as unknown[]).push(Date.now())
    ;(values as unknown[]).push(params.relId)

    await execute(
      `UPDATE character_relationships SET ${fields.join(', ')} WHERE id = ?`,
      values
    )

    const row = await queryFirst(
      `SELECT cr.*,
              ca.name as character_a_name, ca.role as character_a_role,
              cb.name as character_b_name, cb.role as character_b_role
       FROM character_relationships cr
       JOIN characters ca ON ca.id = cr.character_a_id
       JOIN characters cb ON cb.id = cr.character_b_id
       WHERE cr.id = ?`,
      [params.relId]
    )

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
    const existing = await queryFirst(
      'SELECT id FROM character_relationships WHERE id = ? AND book_id = ?',
      [params.relId, params.id]
    )
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await execute('DELETE FROM character_relationships WHERE id = ?', [params.relId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[relationship DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
