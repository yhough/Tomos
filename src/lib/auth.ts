import { queryFirst, execute } from '@/db'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

const COOKIE_NAME = 'auth_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export type SessionUser = {
  id: string
  name: string
  email: string
  plan: string
  onboarded: number
}

export async function createSession(userId: string): Promise<string> {
  const token = nanoid(48)
  const now = Date.now()
  await execute(
    `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    [token, userId, now + SESSION_DURATION_MS, now]
  )
  return token
}

export async function deleteSession(token: string): Promise<void> {
  await execute(`DELETE FROM sessions WHERE token = ?`, [token])
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  return queryFirst<SessionUser>(
    `SELECT u.id, u.name, u.email, COALESCE(u.plan, 'free') as plan,
            COALESCE(u.onboarded, 0) as onboarded
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
    [token, Date.now()]
  )
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value
  if (!token) return null
  return getSessionUser(token)
}

export async function requirePro(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  if (user.plan !== 'pro') throw new Error('Pro plan required')
  return user
}

export function setSessionCookie(token: string): string {
  const maxAge = SESSION_DURATION_MS / 1000
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
}
