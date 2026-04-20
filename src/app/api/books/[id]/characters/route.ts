import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(params.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const characters = db
    .prepare(
      `SELECT id, name, role, description, status, arc_status, data, created_at, updated_at
       FROM characters WHERE book_id = ? ORDER BY
         CASE role
           WHEN 'protagonist' THEN 0
           WHEN 'antagonist'  THEN 1
           WHEN 'supporting'  THEN 2
           ELSE 3
         END, name ASC`
    )
    .all(params.id)

  return NextResponse.json(characters)
}
