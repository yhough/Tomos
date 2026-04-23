import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb } from '../helpers/db'
import { createDbMock } from '../helpers/mockDb'
import type Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let testDb: Database.Database
vi.mock('@/db', () => createDbMock(() => testDb))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
}))

import {
  createSession,
  deleteSession,
  getSessionUser,
  setSessionCookie,
  clearSessionCookie,
} from '@/lib/auth'

beforeEach(() => {
  testDb = createTestDb()
})

// ── Cookie helpers ─────────────────────────────────────────────────────────────

describe('setSessionCookie()', () => {
  it('includes the token in the cookie string', () => {
    const cookie = setSessionCookie('abc123')
    expect(cookie).toContain('auth_session=abc123')
  })

  it('sets HttpOnly and SameSite=Lax', () => {
    const cookie = setSessionCookie('t')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('sets a positive Max-Age', () => {
    const match = setSessionCookie('t').match(/Max-Age=(\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThan(0)
  })
})

describe('clearSessionCookie()', () => {
  it('sets Max-Age=0 to expire the cookie', () => {
    expect(clearSessionCookie()).toContain('Max-Age=0')
  })

  it('includes the cookie name', () => {
    expect(clearSessionCookie()).toContain('auth_session=')
  })
})

// ── Session CRUD ───────────────────────────────────────────────────────────────

function insertUser(db: Database.Database) {
  const id = nanoid()
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, 'Test User', 'test@example.com', 'hash', Date.now())
  return id
}

describe('createSession()', () => {
  it('returns a non-empty token string', async () => {
    const userId = insertUser(testDb)
    const token = await createSession(userId)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('stores the session in the database', async () => {
    const userId = insertUser(testDb)
    const token = await createSession(userId)
    const row = testDb.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as
      | { token: string; user_id: string; expires_at: number }
      | undefined
    expect(row).toBeDefined()
    expect(row!.user_id).toBe(userId)
    expect(row!.expires_at).toBeGreaterThan(Date.now())
  })

  it('generates unique tokens on successive calls', async () => {
    const userId = insertUser(testDb)
    const tokens = new Set(
      await Promise.all(Array.from({ length: 10 }, () => createSession(userId)))
    )
    expect(tokens.size).toBe(10)
  })
})

describe('deleteSession()', () => {
  it('removes the session from the database', async () => {
    const userId = insertUser(testDb)
    const token = await createSession(userId)
    await deleteSession(token)
    const row = testDb.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
    expect(row).toBeUndefined()
  })

  it('does not throw when deleting a non-existent token', async () => {
    await expect(deleteSession('does-not-exist')).resolves.toBeUndefined()
  })
})

describe('getSessionUser()', () => {
  it('returns the user for a valid, non-expired token', async () => {
    const userId = insertUser(testDb)
    const token = await createSession(userId)
    const user = await getSessionUser(token)
    expect(user).not.toBeNull()
    expect(user!.id).toBe(userId)
    expect(user!.email).toBe('test@example.com')
    expect(user!.plan).toBe('free')
  })

  it('returns null for an unknown token', async () => {
    expect(await getSessionUser('unknown-token')).toBeNull()
  })

  it('returns null for an expired token', async () => {
    const userId = insertUser(testDb)
    const token = nanoid(48)
    testDb.prepare(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
    ).run(token, userId, Date.now() - 1000, Date.now())
    expect(await getSessionUser(token)).toBeNull()
  })
})
