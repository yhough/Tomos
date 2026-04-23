import { queryFirst } from '@/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { compare } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  if (!password) return NextResponse.json({ error: 'Password is required.' }, { status: 400 })

  const user = await queryFirst<{ id: string; password_hash: string }>(
    `SELECT id, password_hash FROM users WHERE email = ?`,
    [email.trim().toLowerCase()]
  )

  if (!user) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

  const valid = await compare(password, user.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })

  const token = await createSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', setSessionCookie(token))
  return res
}
