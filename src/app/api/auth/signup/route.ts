import { queryFirst, execute } from '@/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { nanoid } from 'nanoid'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { name, email, password } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })

  const existing = await queryFirst(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()])
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })

  const passwordHash = await hash(password, 12)
  const id = nanoid()
  const now = Date.now()

  await execute(
    `INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, name.trim(), email.trim().toLowerCase(), passwordHash, now]
  )

  const token = await createSession(id)
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', setSessionCookie(token))
  return res
}
