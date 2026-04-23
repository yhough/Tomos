import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb } from '../helpers/db'
import type Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let testDb: Database.Database

vi.mock('@/db', () => ({ get db() { return testDb } }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
}))

// Mock Claude so no real API calls are made during book creation
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

function makeParamRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/api/books/test-id', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

function seedBook(db: Database.Database, overrides: Partial<{
  id: string; title: string; genre: string; premise: string | null
}> = {}) {
  const id = overrides.id ?? nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO books (id, title, genre, premise, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    overrides.title ?? 'Test Book',
    overrides.genre ?? 'Fantasy',
    overrides.premise ?? null,
    now,
    now
  )
  return id
}

beforeEach(() => {
  testDb = createTestDb()
})

// ── GET /api/books ─────────────────────────────────────────────────────────────

describe('GET /api/books', () => {
  it('returns an empty array when no books exist', async () => {
    const res = await listBooks()
    expect(res.status).toBe(200)
    const books = await res.json()
    expect(Array.isArray(books)).toBe(true)
    expect(books).toHaveLength(0)
  })

  it('returns all books ordered by updated_at DESC', async () => {
    seedBook(testDb, { id: 'a', title: 'Older' })
    await new Promise((r) => setTimeout(r, 5)) // ensure different timestamps
    seedBook(testDb, { id: 'b', title: 'Newer' })
    const res = await listBooks()
    const books = await res.json()
    expect(books).toHaveLength(2)
    expect(books[0].title).toBe('Newer')
    expect(books[1].title).toBe('Older')
  })
})

// ── POST /api/books ────────────────────────────────────────────────────────────

describe('POST /api/books', () => {
  it('returns 400 when title is missing', async () => {
    const res = await createBook(makeRequest('POST', { genre: 'Fantasy' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/title/i)
  })

  it('returns 400 when title is blank', async () => {
    const res = await createBook(makeRequest('POST', { title: '   ', genre: 'Fantasy' }))
    expect(res.status).toBe(400)
  })

  it('creates a book and returns 201', async () => {
    const res = await createBook(
      makeRequest('POST', { title: 'My Novel', genre: 'Thriller', premise: 'A spy thriller.' })
    )
    expect(res.status).toBe(201)
    const book = await res.json()
    expect(book.title).toBe('My Novel')
    expect(book.genre).toBe('Thriller')
    expect(book.id).toBeTruthy()
  })

  it('defaults genre to Fantasy when omitted', async () => {
    const res = await createBook(makeRequest('POST', { title: 'No Genre Book' }))
    expect(res.status).toBe(201)
    const book = await res.json()
    expect(book.genre).toBe('Fantasy')
  })

  it('seeds characters from the input', async () => {
    await createBook(
      makeRequest('POST', {
        title: 'Character Book',
        genre: 'Fantasy',
        characters: [
          { name: 'Hero', role: 'protagonist', description: 'The main hero' },
          { name: 'Villain', role: 'antagonist' },
        ],
      })
    )
    const chars = testDb
      .prepare("SELECT name, role FROM characters ORDER BY name ASC")
      .all() as Array<{ name: string; role: string }>
    expect(chars).toHaveLength(2)
    const names = chars.map((c) => c.name)
    expect(names).toContain('Hero')
    expect(names).toContain('Villain')
  })

  it('seeds world entries from the input', async () => {
    await createBook(
      makeRequest('POST', {
        title: 'World Book',
        genre: 'Fantasy',
        worldEntries: [
          { name: 'The Dark Forest', type: 'location', summary: 'A spooky place' },
        ],
      })
    )
    const entry = testDb
      .prepare("SELECT * FROM book_state_entries WHERE name = 'The Dark Forest'")
      .get() as { name: string; type: string; summary: string } | undefined
    expect(entry).toBeDefined()
    expect(entry!.type).toBe('location')
    expect(entry!.summary).toBe('A spooky place')
  })

  it('sets protagonist_name from the first protagonist character', async () => {
    await createBook(
      makeRequest('POST', {
        title: 'Hero Tale',
        genre: 'Fantasy',
        characters: [{ name: 'Aria', role: 'protagonist' }],
      })
    )
    const book = testDb.prepare('SELECT * FROM books WHERE title = ?').get('Hero Tale') as
      | { protagonist_name: string }
      | undefined
    expect(book?.protagonist_name).toBe('Aria')
  })

  it('returns 400 for an invalid JSON body', async () => {
    const req = new Request('http://localhost/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await createBook(req)
    expect(res.status).toBe(400)
  })
})

// ── GET /api/books/[id] ────────────────────────────────────────────────────────

describe('GET /api/books/[id]', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await getBook(makeParamRequest('GET'), { params: { id: 'missing' } })
    expect(res.status).toBe(404)
  })

  it('returns the book for a known id', async () => {
    const id = seedBook(testDb, { title: 'Found Book' })
    const res = await getBook(makeParamRequest('GET'), { params: { id } })
    expect(res.status).toBe(200)
    const book = await res.json()
    expect(book.title).toBe('Found Book')
    expect(book.id).toBe(id)
  })
})

// ── PATCH /api/books/[id] ──────────────────────────────────────────────────────

describe('PATCH /api/books/[id]', () => {
  it('returns 404 for an unknown id', async () => {
    const res = await updateBook(
      makeParamRequest('PATCH', { title: 'Updated' }),
      { params: { id: 'missing' } }
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when title is set to an empty string', async () => {
    const id = seedBook(testDb)
    const res = await updateBook(
      makeParamRequest('PATCH', { title: '' }),
      { params: { id } }
    )
    expect(res.status).toBe(400)
  })

  it('updates the title', async () => {
    const id = seedBook(testDb, { title: 'Old Title' })
    const res = await updateBook(
      makeParamRequest('PATCH', { title: 'New Title' }),
      { params: { id } }
    )
    expect(res.status).toBe(200)
    const book = await res.json()
    expect(book.title).toBe('New Title')
  })

  it('updates genre and premise without touching other fields', async () => {
    const id = seedBook(testDb, { title: 'Stable Title' })
    await updateBook(
      makeParamRequest('PATCH', { genre: 'Horror', premise: 'Dark and creepy' }),
      { params: { id } }
    )
    const book = testDb.prepare('SELECT * FROM books WHERE id = ?').get(id) as {
      title: string; genre: string; premise: string
    }
    expect(book.title).toBe('Stable Title')
    expect(book.genre).toBe('Horror')
    expect(book.premise).toBe('Dark and creepy')
  })
})

// ── DELETE /api/books/[id] ────────────────────────────────────────────────────

describe('DELETE /api/books/[id]', () => {
  it('returns 204 and removes the book', async () => {
    const id = seedBook(testDb)
    const res = await deleteBook(makeParamRequest('DELETE'), { params: { id } })
    expect(res.status).toBe(204)
    const row = testDb.prepare('SELECT id FROM books WHERE id = ?').get(id)
    expect(row).toBeUndefined()
  })

  it('returns 204 even if the book does not exist (idempotent)', async () => {
    const res = await deleteBook(makeParamRequest('DELETE'), { params: { id: 'ghost' } })
    expect(res.status).toBe(204)
  })

  it('cascades deletion to characters belonging to the book', async () => {
    const bookId = seedBook(testDb)
    const now = Date.now()
    testDb.prepare(
      `INSERT INTO characters (id, book_id, name, role, status, data, created_at, updated_at)
       VALUES (?, ?, 'Hero', 'protagonist', 'unknown', '{}', ?, ?)`
    ).run(nanoid(), bookId, now, now)

    await deleteBook(makeParamRequest('DELETE'), { params: { id: bookId } })

    const chars = testDb
      .prepare('SELECT id FROM characters WHERE book_id = ?')
      .all(bookId)
    expect(chars).toHaveLength(0)
  })
})
