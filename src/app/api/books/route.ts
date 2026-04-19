import { db } from '@/db'
import { generateId } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const books = db
    .prepare('SELECT * FROM books ORDER BY updated_at DESC')
    .all()
  return NextResponse.json(books)
}

export async function POST(req: Request) {
  const { title, genre, premise, protagonist_name, protagonist_description } = await req.json()

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const id = generateId()
  const now = Date.now()

  db.prepare(
    `INSERT INTO books (id, title, genre, premise, protagonist_name, protagonist_description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title.trim(),
    genre ?? 'Fantasy',
    premise?.trim() || null,
    protagonist_name?.trim() || null,
    protagonist_description?.trim() || null,
    now,
    now
  )

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id)
  return NextResponse.json(book, { status: 201 })
}
