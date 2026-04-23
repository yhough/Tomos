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
  db.prepare('INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, 'Test', 'Fantasy', now, now)
  return id
}

function seedChar(db: Database.Database, bookId: string, name = 'Alice', role = 'protagonist'): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO characters (id, book_id, name, role, status, data, created_at, updated_at) VALUES (?, ?, ?, ?, 'unknown', '{}', ?, ?)`
  ).run(id, bookId, name, role, now, now)
  return id
}

beforeEach(() => { testDb = createTestDb() })

describe('GET /api/books/[id]/characters', () => {
  it('returns 404 for unknown book', async () => {
    expect((await listCharacters(makeRequest('GET'), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns empty array for book with no characters', async () => {
    const bookId = seedBook(testDb)
    const chars = await (await listCharacters(makeRequest('GET'), { params: { id: bookId } })).json()
    expect(chars).toHaveLength(0)
  })

  it('returns characters sorted by role then name', async () => {
    const bookId = seedBook(testDb)
    seedChar(testDb, bookId, 'Zara', 'supporting')
    seedChar(testDb, bookId, 'Alice', 'protagonist')
    seedChar(testDb, bookId, 'Bob', 'antagonist')
    const chars = await (await listCharacters(makeRequest('GET'), { params: { id: bookId } })).json() as Array<{ name: string }>
    expect(chars[0].name).toBe('Alice')
    expect(chars[1].name).toBe('Bob')
    expect(chars[2].name).toBe('Zara')
  })
})

describe('POST /api/books/[id]/characters', () => {
  it('returns 404 for unknown book', async () => {
    expect((await createCharacter(makeRequest('POST', { name: 'Hero' }), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 400 when name is missing', async () => {
    const bookId = seedBook(testDb)
    expect((await createCharacter(makeRequest('POST', { role: 'protagonist' }), { params: { id: bookId } })).status).toBe(400)
  })

  it('creates a character and returns 201', async () => {
    const bookId = seedBook(testDb)
    const res = await createCharacter(
      makeRequest('POST', { name: 'Merlin', role: 'supporting', status: 'alive' }),
      { params: { id: bookId } }
    )
    expect(res.status).toBe(201)
    const char = await res.json()
    expect(char.name).toBe('Merlin')
    expect(char.status).toBe('alive')
  })

  it('defaults role to minor and status to unknown', async () => {
    const bookId = seedBook(testDb)
    const char = await (await createCharacter(makeRequest('POST', { name: 'Nobody' }), { params: { id: bookId } })).json()
    expect(char.role).toBe('minor')
    expect(char.status).toBe('unknown')
  })
})

describe('PATCH /api/books/[id]/characters/[characterId]', () => {
  it('returns 404 for unknown character', async () => {
    const bookId = seedBook(testDb)
    expect((await updateCharacter(makeRequest('PATCH', { name: 'X' }), { params: { id: bookId, characterId: 'ghost' } })).status).toBe(404)
  })

  it('updates character name', async () => {
    const bookId = seedBook(testDb)
    const charId = seedChar(testDb, bookId, 'OldName')
    const updated = await (await updateCharacter(makeRequest('PATCH', { name: 'NewName' }), { params: { id: bookId, characterId: charId } })).json()
    expect(updated.name).toBe('NewName')
  })
})

describe('DELETE /api/books/[id]/characters/[characterId]', () => {
  it('returns 404 for unknown character', async () => {
    const bookId = seedBook(testDb)
    expect((await deleteCharacter(makeRequest('DELETE'), { params: { id: bookId, characterId: 'ghost' } })).status).toBe(404)
  })

  it('deletes the character', async () => {
    const bookId = seedBook(testDb)
    const charId = seedChar(testDb, bookId, 'Doomed')
    await deleteCharacter(makeRequest('DELETE'), { params: { id: bookId, characterId: charId } })
    expect(testDb.prepare('SELECT id FROM characters WHERE id = ?').get(charId)).toBeUndefined()
  })
})
