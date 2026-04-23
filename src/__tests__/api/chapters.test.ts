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

import { GET as listChapters } from '@/app/api/books/[id]/chapters/route'

function makeRequest(method = 'GET'): Request {
  return new Request('http://localhost', { method })
}

function seedBook(db: Database.Database): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare('INSERT INTO books (id, title, genre, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, 'Book', 'Fantasy', now, now)
  return id
}

function seedChapter(
  db: Database.Database,
  bookId: string,
  overrides: Partial<{ number: number; title: string; processing_status: string }> = {}
): string {
  const id = nanoid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO chapters (id, book_id, number, title, content, word_count, processing_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 3, ?, ?, ?)`
  ).run(id, bookId, overrides.number ?? 1, overrides.title ?? 'Ch One', 'Some content.', overrides.processing_status ?? 'done', now, now)
  return id
}

beforeEach(() => { testDb = createTestDb() })

describe('GET /api/books/[id]/chapters', () => {
  it('returns empty array when no chapters', async () => {
    const bookId = seedBook(testDb)
    const chapters = await (await listChapters(makeRequest(), { params: { id: bookId } })).json()
    expect(chapters).toHaveLength(0)
  })

  it('returns chapters ordered by number ASC', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId, { number: 3, title: 'Three' })
    seedChapter(testDb, bookId, { number: 1, title: 'One' })
    seedChapter(testDb, bookId, { number: 2, title: 'Two' })
    const chapters = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<{ number: number }>
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3])
  })

  it('shapes chapters with expected fields', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId)
    const [ch] = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<Record<string, unknown>>
    expect(ch).toHaveProperty('id')
    expect(ch).toHaveProperty('wordCount')
    expect(ch).toHaveProperty('processed')
    expect(ch).toHaveProperty('flags')
    expect(ch).toHaveProperty('charactersAppearing')
  })

  it('marks done chapter as processed=true', async () => {
    const bookId = seedBook(testDb)
    seedChapter(testDb, bookId, { processing_status: 'done' })
    const [ch] = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<{ processed: boolean }>
    expect(ch.processed).toBe(true)
  })

  it('marks error chapter as processed=false with processingError', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId, { processing_status: 'error' })
    testDb.prepare('UPDATE chapters SET processing_step = ? WHERE id = ?').run('AI timed out', chapterId)
    const [ch] = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<{ processed: boolean; processingError: string | null }>
    expect(ch.processed).toBe(false)
    expect(ch.processingError).toBe('AI timed out')
  })

  it('includes continuity flags for each chapter', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId)
    testDb.prepare(
      `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
       VALUES (?, ?, ?, ?, 'warning', 'continuity', 0, ?)`
    ).run(nanoid(), chapterId, bookId, 'Possible inconsistency', Date.now())
    const [ch] = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<{ flags: Array<{ description: string }> }>
    expect(ch.flags).toHaveLength(1)
    expect(ch.flags[0].description).toBe('Possible inconsistency')
  })

  it('returns flags with resolved as boolean', async () => {
    const bookId = seedBook(testDb)
    const chapterId = seedChapter(testDb, bookId)
    testDb.prepare(
      `INSERT INTO continuity_flags (id, chapter_id, book_id, description, severity, category, resolved, created_at)
       VALUES (?, ?, ?, 'desc', 'info', 'narrative', 1, ?)`
    ).run(nanoid(), chapterId, bookId, Date.now())
    const [ch] = await (await listChapters(makeRequest(), { params: { id: bookId } })).json() as Array<{ flags: Array<{ resolved: boolean }> }>
    expect(ch.flags[0].resolved).toBe(true)
  })
})
