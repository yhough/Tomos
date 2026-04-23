import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  _: Request,
  { params }: { params: { id: string; chapterId: string; annotationId: string } }
) {
  const exists = await queryFirst(
    'SELECT id FROM chapter_annotations WHERE id = ? AND chapter_id = ? AND book_id = ?',
    [params.annotationId, params.chapterId, params.id]
  )

  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute('DELETE FROM chapter_annotations WHERE id = ?', [params.annotationId])
  return NextResponse.json({ ok: true })
}
