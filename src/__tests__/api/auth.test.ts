import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb } from '../helpers/db'
import { createDbMock } from '../helpers/mockDb'
import type Database from 'better-sqlite3'

let testDb: Database.Database
vi.mock('@/db', () => createDbMock(() => testDb))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
}))

import { POST as signupHandler } from '@/app/api/auth/signup/route'
import { POST as loginHandler } from '@/app/api/auth/login/route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  testDb = createTestDb()
})

describe('POST /api/auth/signup', () => {
  it('returns 400 when name is missing', async () => {
    const res = await signupHandler(makeRequest({ email: 'a@b.com', password: 'password123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/i)
  })

  it('returns 400 when email is missing', async () => {
    const res = await signupHandler(makeRequest({ name: 'Alice', password: 'password123' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/email/i)
  })

  it('returns 400 when password is too short', async () => {
    const res = await signupHandler(makeRequest({ name: 'Alice', email: 'a@b.com', password: 'short' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/8 characters/i)
  })

  it('creates a user and returns ok:true with a Set-Cookie header', async () => {
    const res = await signupHandler(
      makeRequest({ name: 'Alice', email: 'alice@example.com', password: 'supersecure' })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(res.headers.get('Set-Cookie')).toContain('auth_session=')
  })

  it('stores the user with a lowercased email', async () => {
    await signupHandler(makeRequest({ name: 'Bob', email: 'BOB@EXAMPLE.COM', password: 'supersecure' }))
    const user = testDb.prepare('SELECT * FROM users WHERE email = ?').get('bob@example.com') as
      | { name: string } | undefined
    expect(user?.name).toBe('Bob')
  })

  it('returns 409 when the email already exists', async () => {
    const payload = { name: 'Alice', email: 'dup@example.com', password: 'supersecure' }
    await signupHandler(makeRequest(payload))
    const res = await signupHandler(makeRequest(payload))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already exists/i)
  })
})

describe('POST /api/auth/login', () => {
  async function createUser(email: string, password: string) {
    await signupHandler(makeRequest({ name: 'Test User', email, password }))
  }

  it('returns 400 when email is missing', async () => {
    const res = await loginHandler(makeRequest({ password: 'pass' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await loginHandler(makeRequest({ email: 'a@b.com' }))
    expect(res.status).toBe(400)
  })

  it('returns 401 for an unknown email', async () => {
    const res = await loginHandler(makeRequest({ email: 'ghost@example.com', password: 'anything' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 for a wrong password', async () => {
    await createUser('user@example.com', 'correctpassword')
    const res = await loginHandler(makeRequest({ email: 'user@example.com', password: 'wrongpassword' }))
    expect(res.status).toBe(401)
  })

  it('returns ok:true with a Set-Cookie header on correct credentials', async () => {
    await createUser('login@example.com', 'mysecretpw')
    const res = await loginHandler(makeRequest({ email: 'login@example.com', password: 'mysecretpw' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    expect(res.headers.get('Set-Cookie')).toContain('auth_session=')
  })

  it('is case-insensitive for email', async () => {
    await createUser('case@example.com', 'password123')
    const res = await loginHandler(makeRequest({ email: 'CASE@EXAMPLE.COM', password: 'password123' }))
    expect(res.status).toBe(200)
  })
})
