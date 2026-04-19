import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(params.id)
  if (!world) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(world)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  db.prepare('DELETE FROM worlds WHERE id = ?').run(params.id)
  return new NextResponse(null, { status: 204 })
}
