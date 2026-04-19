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

  return sqlite
}

export const db = globalThis.__db ?? (globalThis.__db = createDb())
