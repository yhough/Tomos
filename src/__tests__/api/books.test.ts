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
vi.mock('@/lib/claude', () => ({
  generateBookOpening: vi.fn().mockResolvedValue({ logline: 'A test logline.', welcome: 'Welcome!' }),
}))

import { GET as listBooks, POST as createBook } from '@/app/api/books/route'
import {
  GET as getBook,
  PATCH as updateBook,
  DELETE as deleteBook,
} from '@/app/api/books/[id]/route'

function makeRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/books', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

function seedBook(db: Database.Database, overrides: Partial<{ id: string; title: string; genre: string }> = {}) {
  const id = overrides.id ?? nanoid()
  const now = Date.now()
  db.prepare(
    'INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, overrides.title ?? 'Test Book', overrides.genre ?? 'Fantasy', now, now)
  return id
}

beforeEach(() => {
  testDb = createTestDb()
})

describe('GET /api/books', () => {
  it('returns an empty array when no books exist', async () => {
    const books = await (await listBooks()).json()
    expect(books).toHaveLength(0)
  })

  it('returns books ordered by updated_at DESC', async () => {
    seedBook(testDb, { id: 'a', title: 'Older' })
    await new Promise((r) => setTimeout(r, 5))
    seedBook(testDb, { id: 'b', title: 'Newer' })
    const books = await (await listBooks()).json()
    expect(books[0].title).toBe('Newer')
  })
})

describe('POST /api/books', () => {
  it('returns 400 when title is missing', async () => {
    const res = await createBook(makeRequest('POST', { genre: 'Fantasy' }))
    expect(res.status).toBe(400)
  })

  it('creates a book and returns 201', async () => {
    const res = await createBook(makeRequest('POST', { title: 'My Novel', genre: 'Thriller' }))
    expect(res.status).toBe(201)
    const book = await res.json()
    expect(book.title).toBe('My Novel')
    expect(book.id).toBeTruthy()
  })

  it('defaults genre to Fantasy', async () => {
    const res = await createBook(makeRequest('POST', { title: 'No Genre' }))
    expect((await res.json()).genre).toBe('Fantasy')
  })

  it('seeds characters', async () => {
    await createBook(makeRequest('POST', {
      title: 'Char Book',
      characters: [{ name: 'Hero', role: 'protagonist' }, { name: 'Villain', role: 'antagonist' }],
    }))
    const chars = testDb.prepare('SELECT name FROM characters ORDER BY name ASC').all() as Array<{ name: string }>
    expect(chars.map((c) => c.name)).toContain('Hero')
    expect(chars.map((c) => c.name)).toContain('Villain')
  })

  it('seeds world entries', async () => {
    await createBook(makeRequest('POST', {
      title: 'World Book',
      worldEntries: [{ name: 'The Forest', type: 'location', summary: 'Dark woods' }],
    }))
    const entry = testDb.prepare("SELECT * FROM book_state_entries WHERE name = 'The Forest'").get() as
      | { type: string; summary: string } | undefined
    expect(entry?.type).toBe('location')
    expect(entry?.summary).toBe('Dark woods')
  })
})

describe('GET /api/books/[id]', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await getBook(makeRequest('GET'), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('returns the book for a known id', async () => {
    const id = seedBook(testDb, { title: 'Found Book' })
    const res = await getBook(makeRequest('GET'), { params: { id } })
    expect(res.status).toBe(200)
    expect((await res.json()).title).toBe('Found Book')
  })
})

describe('PATCH /api/books/[id]', () => {
  it('returns 404 for unknown id', async () => {
    const res = await updateBook(makeRequest('PATCH', { title: 'x' }), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('returns 400 when title is set to empty string', async () => {
    const id = seedBook(testDb)
    const res = await updateBook(makeRequest('PATCH', { title: '' }), { params: { id } })
    expect(res.status).toBe(400)
  })

  it('updates the title', async () => {
    const id = seedBook(testDb, { title: 'Old' })
    const book = await (await updateBook(makeRequest('PATCH', { title: 'New' }), { params: { id } })).json()
    expect(book.title).toBe('New')
  })
})

describe('DELETE /api/books/[id]', () => {
  it('returns 204 and removes the book', async () => {
    const id = seedBook(testDb)
    const res = await deleteBook(makeRequest('DELETE'), { params: { id } })
    expect(res.status).toBe(204)
    expect(testDb.prepare('SELECT id FROM books WHERE id = ?').get(id)).toBeUndefined()
  })

  it('cascades deletion to characters', async () => {
    const bookId = seedBook(testDb)
    const now = Date.now()
    testDb.prepare(
      `INSERT INTO characters (id, book_id, name, role, status, data, created_at, updated_at)
       VALUES (?, ?, 'Hero', 'protagonist', 'unknown', '{}', ?, ?)`
    ).run(nanoid(), bookId, now, now)
    await deleteBook(makeRequest('DELETE'), { params: { id: bookId } })
    expect(testDb.prepare('SELECT id FROM characters WHERE book_id = ?').all(bookId)).toHaveLength(0)
  })
})
