import { queryFirst, queryAll, execute } from '@/db'
import { generateId } from '@/lib/utils'
import { NextResponse } from 'next/server'

type Ctx = { params: { id: string; chapterId: string } }

export async function GET(_: Request, { params }: Ctx) {
  const rows = await queryAll(
    'SELECT id, text, created_at FROM chapter_annotations WHERE chapter_id = ? AND book_id = ? ORDER BY created_at ASC',
    [params.chapterId, params.id]
  )
  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: Ctx) {
  const { text } = await req.json() as { text: string }
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const chapter = await queryFirst(
    'SELECT id FROM chapters WHERE id = ? AND book_id = ?',
    [params.chapterId, params.id]
  )
  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const id = generateId()
  const now = Date.now()
  await execute(
    `INSERT INTO chapter_annotations (id, chapter_id, book_id, text, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, params.chapterId, params.id, text.trim(), now]
  )
  return NextResponse.json({ id, text: text.trim(), created_at: now }, { status: 201 })
}
