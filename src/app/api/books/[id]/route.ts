import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst('SELECT * FROM books WHERE id = ?', [params.id])
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(book)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst('SELECT id FROM books WHERE id = ?', [params.id])
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { title, genre, premise, logline } = await req.json()
  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 })
  }

  await execute(
    `UPDATE books
     SET title   = COALESCE(?, title),
         genre   = COALESCE(?, genre),
         premise = ?,
         logline = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      title?.trim() ?? null,
      genre ?? null,
      premise !== undefined ? (premise?.trim() || null) : undefined,
      logline !== undefined ? (logline?.trim() || null) : undefined,
      Date.now(),
      params.id,
    ]
  )

  return NextResponse.json(await queryFirst('SELECT * FROM books WHERE id = ?', [params.id]))
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await execute('DELETE FROM books WHERE id = ?', [params.id])
  return new Response(null, { status: 204 })
}
