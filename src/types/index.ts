export type BookGenre =
  | 'Fantasy'
  | 'Science Fiction'
  | 'Literary Fiction'
  | 'Thriller'
  | 'Romance'
  | 'Horror'
  | 'Historical Fiction'
  | 'Mystery'
  | 'Contemporary Fiction'
  | 'Screenplay'
  | 'Other'

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor'
export type CharacterStatus = 'alive' | 'dead' | 'unknown' | 'ambiguous'
export type BookStateType = 'world_fact' | 'location' | 'faction' | 'event' | 'misc'
export type MessageRole = 'user' | 'assistant'
export type RippleStatus = 'pending' | 'accepted' | 'dismissed'
export type ProcessingStatus = 'pending' | 'processing' | 'done' | 'error'
export type ContSource = 'chat' | 'chapter'

// ── Core entities ─────────────────────────────────────────────────────────────

export interface Book {
  id: string
  title: string
  genre: string
  premise: string | null
  protagonist_name: string | null
  protagonist_description: string | null
  logline: string | null
  word_count: number
  created_at: number
  updated_at: number
}

export interface Character {
  id: string
  book_id: string
  name: string
  role: CharacterRole
  description: string | null
  status: CharacterStatus
  arc_status: string | null
  data: string // JSON: { relationships, notable_moments, appearances, traits }
  created_at: number
  updated_at: number
}

export interface CharacterData {
  traits: string[]
  relationships: Array<{ character_name: string; description: string }>
  notable_moments: string[]
  appearances: string[] // chapter ids
}

export interface Chapter {
  id: string
  book_id: string
  number: number
  title: string
  content: string
  word_count: number
  summary: string | null
  processing_status: ProcessingStatus
  processing_step: string | null
  created_at: number
  updated_at: number
}

export interface TimelineEvent {
  id: string
  book_id: string
  title: string
  description: string | null
  source: ContSource
  source_id: string | null
  in_story_date: string | null
  sort_order: number
  created_at: number
}

export interface ChatMessage {
  id: string
  book_id: string
  character_id: string | null
  role: MessageRole
  content: string
  metadata: string // JSON
  created_at: number
}

export interface RippleCard {
  id: string
  message_id: string
  book_id: string
  title: string
  description: string
  status: RippleStatus
  created_at: number
}

export interface ContinuityFlag {
  id: string
  chapter_id: string
  book_id: string
  description: string
  severity: 'soft' | 'hard'
  resolved: number
  created_at: number
}

export interface BookStateEntry {
  id: string
  book_id: string
  type: BookStateType
  name: string
  summary: string | null
  data: string // JSON
  source: ContSource
  source_id: string | null
  created_at: number
  updated_at: number
}

// ── AI response schemas ───────────────────────────────────────────────────────

export interface StateUpdate {
  type: 'world_fact' | 'location' | 'faction' | 'event' | 'misc' | 'character'
  name: string
  action: 'create' | 'update'
  summary: string
  data: Record<string, unknown>
}

export interface Contradiction {
  description: string
  existing: string
  resolution_options: string[]
}

export interface RippleEffect {
  title: string
  description: string
}

export interface ClaudeBookResponse {
  response: string
  input_type: 'fact' | 'event' | 'question'
  state_updates: StateUpdate[]
  ripple_effects: RippleEffect[]
  contradictions: Contradiction[]
  timeline_event?: { title: string; description: string; in_story_date?: string }
}

export interface ChatMetadata {
  input_type?: string
  state_updates?: StateUpdate[]
  contradictions?: Contradiction[]
}
