import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock @/db before importing auth, so the auth module uses our test DB.
import { createTestDb } from '../helpers/db'
import type Database from 'better-sqlite3'

let testDb: Database.Database

vi.mock('@/db', () => {
  // Lazy getter — resolved when tests run
  return {
    get db() {
      return testDb
    },
  }
})

// Also mock next/headers (not available outside Next.js request context)
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
import { nanoid } from 'nanoid'

beforeEach(() => {
  testDb = createTestDb()
})

// ── Cookie helpers ─────────────────────────────────────────────────────────────

describe('setSessionCookie()', () => {
  it('includes the token in the cookie string', () => {
    const token = 'abc123'
    const cookie = setSessionCookie(token)
    expect(cookie).toContain(`auth_session=${token}`)
  })

  it('sets HttpOnly and SameSite=Lax', () => {
    const cookie = setSessionCookie('t')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Lax')
  })

  it('sets a positive Max-Age', () => {
    const cookie = setSessionCookie('t')
    const match = cookie.match(/Max-Age=(\d+)/)
    expect(match).not.toBeNull()
    expect(Number(match![1])).toBeGreaterThan(0)
  })
})

describe('clearSessionCookie()', () => {
  it('sets Max-Age=0 to expire the cookie', () => {
    const cookie = clearSessionCookie()
    expect(cookie).toContain('Max-Age=0')
  })

  it('includes the cookie name', () => {
    expect(clearSessionCookie()).toContain('auth_session=')
  })
})

// ── Session CRUD ───────────────────────────────────────────────────────────────

function insertUser(db: Database.Database) {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, 'Test User', 'test@example.com', 'hash', now)
  return id
}

describe('createSession()', () => {
  it('returns a non-empty token string', () => {
    const userId = insertUser(testDb)
    const token = createSession(userId)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
  })

  it('stores the session in the database', () => {
    const userId = insertUser(testDb)
    const token = createSession(userId)
    const row = testDb.prepare('SELECT * FROM sessions WHERE token = ?').get(token) as
      | { token: string; user_id: string; expires_at: number }
      | undefined
    expect(row).toBeDefined()
    expect(row!.user_id).toBe(userId)
    expect(row!.expires_at).toBeGreaterThan(Date.now())
  })

  it('generates unique tokens on multiple calls', () => {
    const userId = insertUser(testDb)
    const tokens = new Set(Array.from({ length: 10 }, () => createSession(userId)))
    expect(tokens.size).toBe(10)
  })
})

describe('deleteSession()', () => {
  it('removes the session from the database', () => {
    const userId = insertUser(testDb)
    const token = createSession(userId)
    deleteSession(token)
    const row = testDb.prepare('SELECT * FROM sessions WHERE token = ?').get(token)
    expect(row).toBeUndefined()
  })

  it('does not throw when deleting a non-existent token', () => {
    expect(() => deleteSession('does-not-exist')).not.toThrow()
  })
})

describe('getSessionUser()', () => {
  it('returns the user for a valid, non-expired token', () => {
    const userId = insertUser(testDb)
    const token = createSession(userId)
    const user = getSessionUser(token)
    expect(user).not.toBeNull()
    expect(user!.id).toBe(userId)
    expect(user!.email).toBe('test@example.com')
    expect(user!.name).toBe('Test User')
    expect(user!.plan).toBe('free')
  })

  it('returns null for an unknown token', () => {
    expect(getSessionUser('unknown-token')).toBeNull()
  })

  it('returns null for an expired token', () => {
    const userId = insertUser(testDb)
    const token = nanoid(48)
    // Insert a session that expired 1 second ago
    testDb.prepare(
      `INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`
    ).run(token, userId, Date.now() - 1000, Date.now())
    expect(getSessionUser(token)).toBeNull()
  })

  it('returns "free" as default plan when no plan column is set', () => {
    const userId = insertUser(testDb)
    const token = createSession(userId)
    const user = getSessionUser(token)
    expect(user!.plan).toBe('free')
  })
})
