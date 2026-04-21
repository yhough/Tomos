import Database from 'better-sqlite3'
import { join } from 'path'

const DB_PATH = join(process.cwd(), 'grimoire.db')

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

function createDb(): Database.Database {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      premise TEXT,
      protagonist_name TEXT,
      protagonist_description TEXT,
      logline TEXT,
      word_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS book_state_entries (
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
    );

    CREATE TABLE IF NOT EXISTS characters (
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
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending','processing','done','error')),
      processing_step TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL DEFAULT 'chat' CHECK(source IN ('chat','chapter')),
      source_id TEXT,
      in_story_date TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ripple_cards (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','dismissed')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapter_annotations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correction_records (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      world_message_id TEXT NOT NULL REFERENCES chat_messages(id),
      summary TEXT NOT NULL,
      affected_entities TEXT NOT NULL DEFAULT '{}',
      diff TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS continuity_flags (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'soft' CHECK(severity IN ('soft','hard')),
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `)

  // Non-destructive migrations
  try { sqlite.exec(`ALTER TABLE books ADD COLUMN cover_image TEXT`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE timeline_events ADD COLUMN category TEXT NOT NULL DEFAULT 'history'`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE timeline_events ADD COLUMN characters TEXT NOT NULL DEFAULT '[]'`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE timeline_events ADD COLUMN is_correction INTEGER NOT NULL DEFAULT 0`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE chat_messages ADD COLUMN is_correction INTEGER NOT NULL DEFAULT 0`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE chat_messages ADD COLUMN correction_status TEXT`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE chat_messages ADD COLUMN correction_data TEXT`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE chapters ADD COLUMN correction_notes TEXT NOT NULL DEFAULT '[]'`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE chapters ADD COLUMN characters_appearing TEXT NOT NULL DEFAULT '[]'`) } catch { /* already exists */ }
  try { sqlite.exec(`ALTER TABLE continuity_flags ADD COLUMN resolved_by TEXT`) } catch { /* already exists */ }

  // Recreate continuity_flags without the restrictive severity CHECK so the
  // chapter-analysis pipeline can store 'error' / 'warning' / 'info' directly.
  try {
    const hasBroadSeverity = (sqlite
      .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='continuity_flags'`)
      .get() as { sql: string } | undefined)
      ?.sql?.includes("'error'")
    if (!hasBroadSeverity) {
      sqlite.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE continuity_flags_v2 (
          id TEXT PRIMARY KEY,
          chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
          description TEXT NOT NULL,
          severity TEXT NOT NULL DEFAULT 'warning',
          category TEXT NOT NULL DEFAULT 'continuity',
          resolved INTEGER NOT NULL DEFAULT 0,
          resolved_by TEXT,
          created_at INTEGER NOT NULL
        );
        INSERT INTO continuity_flags_v2
          SELECT id, chapter_id, book_id, description,
            CASE severity WHEN 'hard' THEN 'error' WHEN 'soft' THEN 'warning' ELSE severity END,
            'continuity',
            resolved, resolved_by, created_at
          FROM continuity_flags;
        DROP TABLE continuity_flags;
        ALTER TABLE continuity_flags_v2 RENAME TO continuity_flags;
        PRAGMA foreign_keys = ON;
      `)
    }
  } catch { /* already migrated */ }

  // Add category to any existing continuity_flags table that predates the v2 recreation
  try { sqlite.exec(`ALTER TABLE continuity_flags ADD COLUMN category TEXT NOT NULL DEFAULT 'continuity'`) } catch { /* already exists */ }

  return sqlite
}

export const db = globalThis.__db ?? (globalThis.__db = createDb())
