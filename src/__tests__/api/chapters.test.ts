import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestDb } from '../helpers/db'
import type Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let testDb: Database.Database

vi.mock('@/db', () => ({ get db() { return testDb } }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => undefined) })),
}))

import { GET as listChapters } from '@/app/api/books/[id]/chapters/route'

function makeRequest(method = 'GET'): Request {
  return new Request('http://localhost', { method })
}

function seedBook(db: Database.Database): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    'INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, 'Test Book', 'Fantasy', now, now)
  return id
}

function seedChapter(
  db: Database.Database,
  bookId: string,
  overrides: Partial<{
    number: number
    title: string
    content: string
    processing_status: string
    summary: string | null
  }> = {}
): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO chapters
       (id, book_id, number, title, content, word_count, processing_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    bookId,
    overrides.number ?? 1,
    overrides.title ?? 'Chapter One',
    overrides.content ?? 'Some content here.',
    overrides.content ? overrides.content.trim().split(/\s+/).length : 3,
    overrides.processing_status ?? 'done',
    now,
    now
  )
  return id
}

beforeEach(() => {
  testDb = createTestDb()
})

// ── GET /api/books/[id]/chapters ──────────────────────────────────────────────

describe('GET /api/books/[id]/chapters', () => {
  it('returns an empty array for a book with no chapters', async () => {
    const bookId = seedBook(testDb)
    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    expect(res.status).toBe(200)
    const chapters = await res.json()
    expect(Array.isArray(chapters)).toBe(true)
    expect(chapters).toHaveLength(0)
  })

  it('returns chapters ordered by number ASC', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId, { number: 3, title: 'Chapter Three' })
    seedChapter(testDb, bookId, { number: 1, title: 'Chapter One' })
    seedChapter(testDb, bookId, { number: 2, title: 'Chapter Two' })

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const chapters = (await res.json()) as Array<{ number: number; title: string }>
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3])
  })

  it('shapes each chapter with the expected fields', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId, { title: 'Intro', processing_status: 'done' })

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const [chapter] = (await res.json()) as Array<Record<string, unknown>>
    expect(chapter).toHaveProperty('id')
    expect(chapter).toHaveProperty('number')
    expect(chapter).toHaveProperty('title')
    expect(chapter).toHaveProperty('wordCount')
    expect(chapter).toHaveProperty('processed')
    expect(chapter).toHaveProperty('flags')
    expect(chapter).toHaveProperty('charactersAppearing')
    expect(chapter).toHaveProperty('correctionNotes')
  })

  it('marks a done chapter as processed=true', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId, { processing_status: 'done' })

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const [chapter] = (await res.json()) as Array<{ processed: boolean }>
    expect(chapter.processed).toBe(true)
  })

  it('marks an error chapter as processed=false with processingError', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId, { processing_status: 'error' })
    testDb.prepare('UPDATE chapters SET processing_step = ? WHERE id = ?').run('AI timed out', chapterId)

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const [chapter] = (await res.json()) as Array<{ processed: boolean; processingError: string | null }>
    expect(chapter.processed).toBe(false)
    expect(chapter.processingError).toBe('AI timed out')
  })

  it('includes continuity flags for each chapter', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId)
    testDb.prepare(
      `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
       VALUES (?, ?, ?, ?, 'warning', 'continuity', 0, ?)`
    ).run(nanoid(), chapterId, bookId, 'Possible inconsistency', Date.now())

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const [chapter] = (await res.json()) as Array<{ flags: Array<{ description: string }> }>
    expect(chapter.flags).toHaveLength(1)
    expect(chapter.flags[0].description).toBe('Possible inconsistency')
  })

  it('returns flags with resolved boolean (not raw 0/1)', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId)
    testDb.prepare(
      `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
       VALUES (?, ?, ?, 'desc', 'info', 'narrative', 1, ?)`
    ).run(nanoid(), chapterId, bookId, Date.now())

    const res = await listChapters(makeRequest(), { params: { id: bookId } })
    const [chapter] = (await res.json()) as Array<{ flags: Array<{ resolved: boolean }> }>
    expect(chapter.flags[0].resolved).toBe(true)
  })
})
