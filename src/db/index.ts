import { createClient, type Client } from '@libsql/client'

declare global {
  // eslint-disable-next-line no-var
  var __db: Client | undefined
}

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db'
  const authToken = process.env.TURSO_AUTH_TOKEN
  return createClient({ url, authToken })
}

export const db = globalThis.__db ?? (globalThis.__db = makeClient())

// ── Types ─────────────────────────────────────────────────────────────────────

type InValue = null | string | number | bigint | Uint8Array | ArrayBuffer | boolean
export type Args = Array<InValue> | Record<string, InValue>
// Use unknown[] so callers don't need explicit casts on mixed arrays
export type Statement = { sql: string; args?: unknown[] }

// ── Lazy schema init (runs once per process) ───────────────────────────────────

let _initPromise: Promise<void> | undefined

export async function initDb(): Promise<void> {
  if (_initPromise) return _initPromise
  _initPromise = runMigrations()
  return _initPromise
}

async function runMigrations(): Promise<void> {
  // Run each CREATE TABLE individually (executeMultiple isn't universally supported)
  const tables = [
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      premise TEXT,
      protagonist_name TEXT,
      protagonist_description TEXT,
      logline TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      cover_image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS book_state_entries (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('world_fact','location','faction','event','misc')),
      name TEXT NOT NULL,
      summary TEXT,
      data TEXT NOT NULL DEFAULT '{}',
      source TEXT NOT NULL DEFAULT 'chat' CHECK(source IN ('chat','chapter')),
      source_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'minor' CHECK(role IN ('protagonist','antagonist','supporting','minor')),
      description TEXT,
      status TEXT NOT NULL DEFAULT 'unknown' CHECK(status IN ('alive','dead','unknown','ambiguous')),
      arc_status TEXT,
      data TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK(processing_status IN ('pending','processing','done','error')),
      processing_step TEXT,
      correction_notes TEXT NOT NULL DEFAULT '[]',
      characters_appearing TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'chat' CHECK(source IN ('chat','chapter')),
      source_id TEXT,
      in_story_date TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'history',
      characters TEXT NOT NULL DEFAULT '[]',
      is_correction INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      is_correction INTEGER NOT NULL DEFAULT 0,
      correction_status TEXT,
      correction_data TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS ripple_cards (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed')),
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS chapter_annotations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS correction_records (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      world_message_id TEXT NOT NULL REFERENCES chat_messages(id),
      summary TEXT NOT NULL,
      affected_entities TEXT NOT NULL DEFAULT '{}',
      diff TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS continuity_flags (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'warning',
      category TEXT NOT NULL DEFAULT 'continuity',
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_by TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      stripe_customer_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      plan_expires_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS character_relationships (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      character_a_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      character_b_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'unknown'
           CHECK(type IN ('ally','enemy','neutral','romantic','family','mentor','rival','unknown')),
      description TEXT,
      strength INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'unknown'
             CHECK(status IN ('active','strained','broken','unknown')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(character_a_id, character_b_id)
    )`,
  ]

  for (const sql of tables) {
    await db.execute(sql)
  }

  // Non-destructive column migrations
  const columnMigrations = [
    `ALTER TABLE users ADD COLUMN onboarded INTEGER NOT NULL DEFAULT 0`,
  ]
  for (const sql of columnMigrations) {
    try { await db.execute(sql) } catch { /* column already exists */ }
  }
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  args: Args = []
): Promise<T[]> {
  await initDb()
  const { rows } = await db.execute({ sql, args })
  return rows as unknown as T[]
}

export async function queryFirst<T = Record<string, unknown>>(
  sql: string,
  args: Args = []
): Promise<T | null> {
  await initDb()
  const { rows } = await db.execute({ sql, args })
  return rows.length > 0 ? (rows[0] as unknown as T) : null
}

export async function execute(sql: string, args: Args = []): Promise<void> {
  await initDb()
  await db.execute({ sql, args })
}

export async function batchWrite(statements: Statement[]): Promise<void> {
  await initDb()
  await db.batch(
    statements.map((s) => ({ sql: s.sql, args: (s.args ?? []) as Args })),
    'write'
  )
}
