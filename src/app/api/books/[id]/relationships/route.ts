import { queryAll, queryFirst, execute } from '@/db'
import { generateId } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await queryAll(
      `SELECT cr.*,
              ca.name as character_a_name, ca.role as character_a_role,
              cb.name as character_b_name, cb.role as character_b_role
       FROM character_relationships cr
       JOIN characters ca ON ca.id = cr.character_a_id
       JOIN characters cb ON cb.id = cr.character_b_id
       WHERE cr.book_id = ?
       ORDER BY cr.strength DESC, cr.created_at ASC`,
      [params.id]
    )
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[relationships GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json() as {
      character_a_id: string
      character_b_id: string
      type?: string
      description?: string
      strength?: number
      status?: string
    }

    const { character_a_id, character_b_id } = body
    if (!character_a_id || !character_b_id) {
      return NextResponse.json({ error: 'Both character IDs are required' }, { status: 400 })
    }
    if (character_a_id === character_b_id) {
      return NextResponse.json({ error: 'A character cannot relate to itself' }, { status: 400 })
    }

    const [aId, bId] = [character_a_id, character_b_id].sort()

    const existing = await queryFirst(
      'SELECT id FROM character_relationships WHERE character_a_id = ? AND character_b_id = ?',
      [aId, bId]
    )
    if (existing) {
      return NextResponse.json({ error: 'Relationship already exists' }, { status: 409 })
    }

    const now = Date.now()
    const id = generateId()
    const type = body.type ?? 'unknown'
    const strength = Math.min(5, Math.max(1, body.strength ?? 1))
    const status = body.status ?? 'unknown'

    await execute(
      `INSERT INTO character_relationships
         (id, book_id, character_a_id, character_b_id, type, description, strength, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, params.id, aId, bId, type, body.description ?? null, strength, status, now, now]
    )

    const row = await queryFirst(
      `SELECT cr.*,
              ca.name as character_a_name, ca.role as character_a_role,
              cb.name as character_b_name, cb.role as character_b_role
       FROM character_relationships cr
       JOIN characters ca ON ca.id = cr.character_a_id
       JOIN characters cb ON cb.id = cr.character_b_id
       WHERE cr.id = ?`,
      [id]
    )

    return NextResponse.json(row, { status: 201 })
  } catch (err) {
    console.error('[relationships POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
