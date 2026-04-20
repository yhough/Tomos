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
      const entry = db.prepare(
        'SELECT id, summary, data FROM book_state_entries WHERE book_id = ? AND name = ?'
      ).get(params.id, u.name) as { id: string; summary: string | null; data: string } | undefined
      if (!entry) continue

      if (u.field === 'summary') {
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
      const char = db.prepare(
        'SELECT id, data FROM characters WHERE book_id = ? AND name = ?'
      ).get(params.id, u.name) as { id: string; data: string } | undefined
      if (!char) continue

      if (['description', 'status', 'arc_status'].includes(u.field)) {
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

    // ── Create TimelineEvent ──────────────────────────────────────────────────
    const maxOrder = (
      db.prepare('SELECT MAX(sort_order) as m FROM timeline_events WHERE book_id = ?')
        .get(params.id) as { m: number | null }
    )?.m ?? 0

    db.prepare(
      `INSERT INTO timeline_events
         (id, book_id, title, description, source, source_id, in_story_date, sort_order, created_at, category, is_correction)
       VALUES (?, ?, ?, ?, 'world_chat', ?, NULL, ?, ?, 'correction', 1)`
    ).run(
      generateId(),
      params.id,
      correctionData.summary,
      `Corrected: ${correctionData.whatChanged} → ${correctionData.whatItBecomes}`,
      worldMessageId,
      maxOrder + 1,
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
