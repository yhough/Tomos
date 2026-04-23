import Database from 'better-sqlite3'
import { vi } from 'vitest'

/**
 * Returns a vi.mock factory for `@/db` that delegates all async helpers to
 * a `better-sqlite3` in-memory database via a getter closure.
 *
 * Usage in a test file:
 *
 *   let testDb: Database.Database
 *   vi.mock('@/db', () => createDbMock(() => testDb))
 *   beforeEach(() => { testDb = createTestDb() })
 */
export function createDbMock(getDb: () => Database.Database) {
  return {
    initDb: vi.fn().mockResolvedValue(undefined),

    queryAll: vi.fn(async <T>(sql: string, args: unknown[] = []): Promise<T[]> => {
      return getDb().prepare(sql).all(...args) as T[]
    }),

    queryFirst: vi.fn(async <T>(sql: string, args: unknown[] = []): Promise<T | null> => {
      return (getDb().prepare(sql).get(...args) as T | undefined) ?? null
    }),

    execute: vi.fn(async (sql: string, args: unknown[] = []): Promise<void> => {
      getDb().prepare(sql).run(...args)
    }),

    batchWrite: vi.fn(async (stmts: Array<{ sql: string; args?: unknown[] }>): Promise<void> => {
      const db = getDb()
      db.transaction(() => {
        for (const s of stmts) db.prepare(s.sql).run(...(s.args ?? []))
      })()
    }),

    // Expose raw db for direct test assertions
    get db() { return getDb() },
  }
}
