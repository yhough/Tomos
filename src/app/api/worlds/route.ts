import { db } from '@/db'
import { generateId } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const worlds = db
    .prepare('SELECT * FROM worlds ORDER BY updated_at DESC')
    .all()
  return NextResponse.json(worlds)
}

export async function POST(req: Request) {
  const { name, genre, premise } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const id = generateId()
  const now = Date.now()

  db.prepare(
    `INSERT INTO worlds (id, name, genre, premise, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name.trim(), genre, premise?.trim() || null, now, now)

  const world = db.prepare('SELECT * FROM worlds WHERE id = ?').get(id)
  return NextResponse.json(world, { status: 201 })
}
