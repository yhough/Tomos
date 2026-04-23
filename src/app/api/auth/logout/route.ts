import { deleteSession, clearSessionCookie } from '@/lib/auth'

const COOKIE_NAME = 'auth_session'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const token = cookies().get(COOKIE_NAME)?.value
  if (token) await deleteSession(token)
  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', clearSessionCookie())
  return res
}
