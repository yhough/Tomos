import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb } from '../helpers/db'
import type Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let testDb: Database.Database

vi.mock('@/db', () => ({ get db() { return testDb } }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
}))

import {
  GET as listCharacters,
  POST as createCharacter,
} from '@/app/api/books/[id]/characters/route'
import {
  PATCH as updateCharacter,
  DELETE as deleteCharacter,
} from '@/app/api/books/[id]/characters/[characterId]/route'

function makeRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

function seedBook(db: Database.Database): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    'INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, 'Test Book', 'Fantasy', now, now)
  return id
}

function seedCharacter(db: Database.Database, bookId: string, name = 'Alice', role = 'protagonist'): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO characters (id, book_id, name, role, status, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'unknown', '{}', ?, ?)`
  ).run(id, bookId, name, role, now, now)
  return id
}

beforeEach(() => {
  testDb = createTestDb()
})

// ── GET /api/books/[id]/characters ─────────────────────────────────────────────

describe('GET /api/books/[id]/characters', () => {
  it('returns 404 for an unknown book', async () => {
    const res = await listCharacters(makeRequest('GET'), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('returns an empty array when the book has no characters', async () => {
    const bookId = seedBook(testDb)
    const res = await listCharacters(makeRequest('GET'), { params: { id: bookId } })
    expect(res.status).toBe(200)
    const chars = await res.json()
    expect(chars).toHaveLength(0)
  })

  it('returns characters sorted by role then name', async () => {
    const bookId = seedBook(testDb)
    seedCharacter(testDb, bookId, 'Zara', 'supporting')
    seedCharacter(testDb, bookId, 'Alice', 'protagonist')
    seedCharacter(testDb, bookId, 'Bob', 'antagonist')

    const res = await listCharacters(makeRequest('GET'), { params: { id: bookId } })
    const chars = (await res.json()) as Array<{ name: string; role: string }>
    expect(chars[0].name).toBe('Alice') // protagonist first
    expect(chars[1].name).toBe('Bob')   // antagonist second
    expect(chars[2].name).toBe('Zara')  // supporting third
  })
})

// ── POST /api/books/[id]/characters ────────────────────────────────────────────

describe('POST /api/books/[id]/characters', () => {
  it('returns 404 for an unknown book', async () => {
    const res = await createCharacter(
      makeRequest('POST', { name: 'Hero', role: 'protagonist' }),
      { params: { id: 'missing' } }
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when name is missing', async () => {
    const bookId = seedBook(testDb)
    const res = await createCharacter(
      makeRequest('POST', { role: 'protagonist' }),
      { params: { id: bookId } }
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/name/i)
  })

  it('creates a character and returns 201', async () => {
    const bookId = seedBook(testDb)
    const res = await createCharacter(
      makeRequest('POST', { name: 'Merlin', role: 'supporting', description: 'A wizard', status: 'alive' }),
      { params: { id: bookId } }
    )
    expect(res.status).toBe(201)
    const char = await res.json()
    expect(char.name).toBe('Merlin')
    expect(char.role).toBe('supporting')
    expect(char.status).toBe('alive')
  })

  it('defaults role to minor and status to unknown', async () => {
    const bookId = seedBook(testDb)
    const res = await createCharacter(
      makeRequest('POST', { name: 'Nameless' }),
      { params: { id: bookId } }
    )
    const char = await res.json()
    expect(char.role).toBe('minor')
    expect(char.status).toBe('unknown')
  })
})

// ── PATCH /api/books/[id]/characters/[characterId] ────────────────────────────

describe('PATCH /api/books/[id]/characters/[characterId]', () => {
  it('returns 404 for an unknown character', async () => {
    const bookId = seedBook(testDb)
    const res = await updateCharacter(
      makeRequest('PATCH', { name: 'Updated' }),
      { params: { id: bookId, characterId: 'ghost' } }
    )
    expect(res.status).toBe(404)
  })

  it('updates the character name', async () => {
    const bookId = seedBook(testDb)
    const charId = seedCharacter(testDb, bookId, 'OldName')
    const res = await updateCharacter(
      makeRequest('PATCH', { name: 'NewName' }),
      { params: { id: bookId, characterId: charId } }
    )
    expect(res.status).toBe(200)
    const updated = await res.json()
    expect(updated.name).toBe('NewName')
  })

  it('updates status and role independently', async () => {
    const bookId = seedBook(testDb)
    const charId = seedCharacter(testDb, bookId, 'Hero', 'minor')
    await updateCharacter(
      makeRequest('PATCH', { status: 'dead', role: 'antagonist' }),
      { params: { id: bookId, characterId: charId } }
    )
    const row = testDb.prepare('SELECT status, role FROM characters WHERE id = ?').get(charId) as
      | { status: string; role: string }
      | undefined
    expect(row?.status).toBe('dead')
    expect(row?.role).toBe('antagonist')
  })
})

// ── DELETE /api/books/[id]/characters/[characterId] ───────────────────────────

describe('DELETE /api/books/[id]/characters/[characterId]', () => {
  it('returns 404 for an unknown character', async () => {
    const bookId = seedBook(testDb)
    const res = await deleteCharacter(
      makeRequest('DELETE'),
      { params: { id: bookId, characterId: 'ghost' } }
    )
    expect(res.status).toBe(404)
  })

  it('deletes the character and returns ok:true', async () => {
    const bookId = seedBook(testDb)
    const charId = seedCharacter(testDb, bookId, 'Doomed')
    const res = await deleteCharacter(
      makeRequest('DELETE'),
      { params: { id: bookId, characterId: charId } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    const row = testDb.prepare('SELECT id FROM characters WHERE id = ?').get(charId)
    expect(row).toBeUndefined()
  })
})
