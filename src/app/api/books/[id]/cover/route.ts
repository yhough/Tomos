import { queryFirst, execute } from '@/db'
import { mkdir, writeFile } from 'fs/promises'
import { NextResponse } from 'next/server'
import { join } from 'path'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst('SELECT id FROM books WHERE id = ?', [params.id])
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use JPEG, PNG, WebP, or GIF.' },
      { status: 415 }
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })
  }

  const filename = `${params.id}.${ext}`
  const dir = join(process.cwd(), 'public', 'covers')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()))

  const coverPath = `/covers/${filename}`
  await execute(
    'UPDATE books SET cover_image = ?, updated_at = ? WHERE id = ?',
    [coverPath, Date.now(), params.id]
  )

  return NextResponse.json({ cover_image: coverPath })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await execute(
    'UPDATE books SET cover_image = NULL, updated_at = ? WHERE id = ?',
    [Date.now(), params.id]
  )
  return NextResponse.json({ cover_image: null })
}
