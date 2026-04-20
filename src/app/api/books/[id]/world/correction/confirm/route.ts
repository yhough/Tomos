import { db } from '@/db'
import { generateId } from '@/lib/utils'
import type { CorrectionData } from '@/types'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { worldMessageId } = await req.json() as { worldMessageId: string }

    const msg = db.prepare(
      'SELECT id, correction_status, correction_data FROM chat_messages WHERE id = ? AND book_id = ?'
    ).get(worldMessageId, params.id) as {
      id: string
      correction_status: string | null
      correction_data: string | null
    } | undefined

    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (msg.correction_status !== 'pending_confirmation') {
      return NextResponse.json({ error: 'Not pending' }, { status: 400 })
    }

    let correctionData: CorrectionData
    try {
      correctionData = JSON.parse(msg.correction_data ?? '{}') as CorrectionData
    } catch {
      return NextResponse.json({ error: 'Invalid correction data' }, { status: 400 })
    }

    const now = Date.now()
    const diff = correctionData.proposedDiff

    // ── Lore entry updates ────────────────────────────────────────────────────
    for (const u of diff.loreEntryUpdates ?? []) {
      // Try exact name first, then fall back to oldValue in case AI used the new name
      const entry = (
        db.prepare('SELECT id, summary, data FROM book_state_entries WHERE book_id = ? AND name = ?')
          .get(params.id, u.name) ??
        (u.oldValue ? db.prepare('SELECT id, summary, data FROM book_state_entries WHERE book_id = ? AND name = ?')
          .get(params.id, u.oldValue) : undefined)
      ) as { id: string; summary: string | null; data: string } | undefined
      if (!entry) continue

      if (u.field === 'name') {
        db.prepare('UPDATE book_state_entries SET name = ?, updated_at = ? WHERE id = ?')
          .run(u.newValue, now, entry.id)
      } else if (u.field === 'summary') {
        db.prepare('UPDATE book_state_entries SET summary = ?, updated_at = ? WHERE id = ?')
          .run(u.newValue, now, entry.id)
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(entry.data) } catch { /* use empty */ }
        data[u.field] = u.newValue
        db.prepare('UPDATE book_state_entries SET data = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(data), now, entry.id)
      }
    }

    // ── Character updates ─────────────────────────────────────────────────────
    for (const u of diff.characterUpdates ?? []) {
      // Try exact name first, then fall back to oldValue (AI sometimes uses the corrected name as the key)
      const char = (
        db.prepare('SELECT id, data FROM characters WHERE book_id = ? AND name = ?')
          .get(params.id, u.name) ??
        (u.oldValue ? db.prepare('SELECT id, data FROM characters WHERE book_id = ? AND name = ?')
          .get(params.id, u.oldValue) : undefined)
      ) as { id: string; data: string } | undefined
      if (!char) continue

      if (u.field === 'name') {
        db.prepare('UPDATE characters SET name = ?, updated_at = ? WHERE id = ?')
          .run(u.newValue, now, char.id)
      } else if (['description', 'status', 'arc_status'].includes(u.field)) {
        db.prepare(`UPDATE characters SET ${u.field} = ?, updated_at = ? WHERE id = ?`)
          .run(u.newValue, now, char.id)
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(char.data) } catch { /* use empty */ }
        data[u.field] = u.newValue
        db.prepare('UPDATE characters SET data = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(data), now, char.id)
      }
    }

    // ── Chapter summary updates ───────────────────────────────────────────────
    for (const u of diff.chapterSummaryUpdates ?? []) {
      const chapter = db.prepare(
        'SELECT id, summary, correction_notes FROM chapters WHERE book_id = ? AND number = ?'
      ).get(params.id, u.chapterNumber) as {
        id: string
        summary: string | null
        correction_notes: string
      } | undefined
      if (!chapter) continue

      const newSummary = chapter.summary
        ? chapter.summary.replace(u.oldSentence, u.newSentence)
        : u.newSentence

      let notes: Array<unknown> = []
      try { notes = JSON.parse(chapter.correction_notes ?? '[]') } catch { /* use empty */ }
      notes.push({
        id: generateId(),
        summary: correctionData.summary,
        appliedAt: new Date().toISOString(),
        worldMessageId,
      })

      db.prepare(
        'UPDATE chapters SET summary = ?, correction_notes = ?, updated_at = ? WHERE id = ?'
      ).run(newSummary, JSON.stringify(notes), now, chapter.id)
    }

    // ── Resolve flags ─────────────────────────────────────────────────────────
    for (const flagId of diff.flagsToResolve ?? []) {
      db.prepare(
        'UPDATE continuity_flags SET resolved = 1, resolved_by = ? WHERE id = ? AND book_id = ?'
      ).run(worldMessageId, flagId, params.id)
    }

    // ── Create CorrectionRecord ───────────────────────────────────────────────
    const correctionRecordId = generateId()
    db.prepare(
      `INSERT INTO correction_records (id, book_id, world_message_id, summary, affected_entities, diff, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      correctionRecordId,
      params.id,
      worldMessageId,
      correctionData.summary,
      JSON.stringify(correctionData.affectedEntities),
      JSON.stringify(diff),
      now
    )

    // ── Update WorldMessage status ────────────────────────────────────────────
    db.prepare("UPDATE chat_messages SET correction_status = 'confirmed' WHERE id = ?")
      .run(worldMessageId)

    db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(now, params.id)

    return NextResponse.json({ success: true, correctionRecordId })
  } catch (err) {
    console.error('[correction/confirm] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
