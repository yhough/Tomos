import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(params.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(book)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM books WHERE id = ?').run(params.id)
  return new NextResponse(null, { status: 204 })
}
