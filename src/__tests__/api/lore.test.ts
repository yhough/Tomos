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

import { GET as getLore, POST as createLore } from '@/app/api/books/[id]/lore/route'

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
  db.prepare('INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, 'Lore Book', 'Fantasy', now, now)
  return id
}

beforeEach(() => { testDb = createTestDb() })

describe('GET /api/books/[id]/lore', () => {
  it('returns 404 for unknown book', async () => {
    expect((await getLore(makeRequest('GET'), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns empty sections for a book with no lore', async () => {
    const bookId = seedBook(testDb)
    const body = await (await getLore(makeRequest('GET'), { params: { id: bookId } })).json()
    expect(body.sections.characters).toHaveLength(0)
    expect(body.sections.locations).toHaveLength(0)
  })

  it('categorises entries by type', async () => {
    const bookId = seedBook(testDb)
    const now = Date.now()
    testDb.prepare(
      `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, created_at, updated_at)
       VALUES (?, ?, 'location', 'The Forest', 'Dark', '{}', 'chat', ?, ?)`
    ).run(nanoid(), bookId, now, now)
    const body = await (await getLore(makeRequest('GET'), { params: { id: bookId } })).json()
    expect(body.sections.locations).toHaveLength(1)
    expect(body.sections.locations[0].name).toBe('The Forest')
  })

  it('categorises magic entries under sections.magic', async () => {
    const bookId = seedBook(testDb)
    const now = Date.now()
    testDb.prepare(
      `INSERT INTO book_state_entries (id, book_id, type, name, summary, data, source, created_at, updated_at)
       VALUES (?, ?, 'misc', 'Aether', null, '{"category":"magic"}', 'chat', ?, ?)`
    ).run(nanoid(), bookId, now, now)
    const body = await (await getLore(makeRequest('GET'), { params: { id: bookId } })).json()
    expect(body.sections.magic).toHaveLength(1)
    expect(body.sections.misc).toHaveLength(0)
  })
})

describe('POST /api/books/[id]/lore', () => {
  it('returns 404 for unknown book', async () => {
    expect((await createLore(makeRequest('POST', { name: 'X' }), { params: { id: 'missing' } })).status).toBe(404)
  })

  it('returns 400 when name is missing', async () => {
    const bookId = seedBook(testDb)
    expect((await createLore(makeRequest('POST', { category: 'location' }), { params: { id: bookId } })).status).toBe(400)
  })

  it('creates a lore entry and returns 201', async () => {
    const bookId = seedBook(testDb)
    const res = await createLore(makeRequest('POST', { name: 'The Keep', category: 'location', summary: 'A fortress' }), { params: { id: bookId } })
    expect(res.status).toBe(201)
    const entry = await res.json()
    expect(entry.name).toBe('The Keep')
    expect(entry.type).toBe('location')
  })

  it('stores misc type with category:magic in data for magic category', async () => {
    const bookId = seedBook(testDb)
    await createLore(makeRequest('POST', { name: 'Fire Magic', category: 'magic' }), { params: { id: bookId } })
    const row = testDb.prepare("SELECT type, data FROM book_state_entries WHERE name = 'Fire Magic'").get() as
      | { type: string; data: string } | undefined
    expect(row?.type).toBe('misc')
    expect(JSON.parse(row!.data).category).toBe('magic')
  })
})
