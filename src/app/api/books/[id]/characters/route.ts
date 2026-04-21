import { db } from '@/db'
import { nanoid } from 'nanoid'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(params.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, description, status, role } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })

  const id = nanoid()
  const now = Date.now()

  db.prepare(`
    INSERT INTO characters (id, book_id, name, description, status, role, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?)
  `).run(id, params.id, name.trim(), description?.trim() ?? null, status ?? 'unknown', role ?? 'minor', now, now)

  return NextResponse.json({ id, name: name.trim(), description: description?.trim() ?? null, status: status ?? 'unknown', role: role ?? 'minor' }, { status: 201 })
}

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
