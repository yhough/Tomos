import { queryFirst, queryAll, execute } from '@/db'
import { generateId } from '@/lib/utils'
import type { CorrectionData } from '@/types'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { worldMessageId } = await req.json() as { worldMessageId: string }

    const msg = await queryFirst<{
      id: string
      correction_status: string | null
      correction_data: string | null
    }>(
      'SELECT id, correction_status, correction_data FROM chat_messages WHERE id = ? AND book_id = ?',
      [worldMessageId, params.id]
    )

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
      let entry = await queryFirst<{ id: string; summary: string | null; data: string }>(
        'SELECT id, summary, data FROM book_state_entries WHERE book_id = ? AND name = ?',
        [params.id, u.name]
      )
      if (!entry && u.oldValue) {
        entry = await queryFirst<{ id: string; summary: string | null; data: string }>(
          'SELECT id, summary, data FROM book_state_entries WHERE book_id = ? AND name = ?',
          [params.id, u.oldValue]
        )
      }
      if (!entry) continue

      if (u.field === 'name') {
        await execute(
          'UPDATE book_state_entries SET name = ?, updated_at = ? WHERE id = ?',
          [u.newValue, now, entry.id]
        )
      } else if (u.field === 'summary') {
        await execute(
          'UPDATE book_state_entries SET summary = ?, updated_at = ? WHERE id = ?',
          [u.newValue, now, entry.id]
        )
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(entry.data) } catch { /* ok */ }
        data[u.field] = u.newValue
        await execute(
          'UPDATE book_state_entries SET data = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(data), now, entry.id]
        )
      }
    }

    // ── Character updates ─────────────────────────────────────────────────────
    console.log('[correction/confirm] characterUpdates:', JSON.stringify(diff.characterUpdates ?? []))
    for (const u of diff.characterUpdates ?? []) {
      const namesToTry = [u.name, u.oldValue].filter(Boolean) as string[]
      let char: { id: string; data: string } | null = null
      for (const candidate of namesToTry) {
        char = await queryFirst<{ id: string; data: string }>(
          'SELECT id, data FROM characters WHERE book_id = ? AND LOWER(name) = LOWER(?)',
          [params.id, candidate]
        )
        if (char) break
      }
      console.log('[correction/confirm] char lookup for', u.name, '/', u.oldValue, '→', char ? 'found' : 'NOT FOUND')
      if (!char) continue

      if (u.field === 'name') {
        const oldName = u.oldValue ?? u.name
        await execute('UPDATE characters SET name = ?, updated_at = ? WHERE id = ?', [u.newValue, now, char.id])

        const timelineEvents = await queryAll<{ id: string; characters: string }>(
          'SELECT id, characters FROM timeline_events WHERE book_id = ?',
          [params.id]
        )
        for (const te of timelineEvents) {
          let names: string[] = []
          try { names = JSON.parse(te.characters) } catch { continue }
          if (!names.some((n) => n.toLowerCase() === oldName.toLowerCase())) continue
          const updated = names.map((n) => n.toLowerCase() === oldName.toLowerCase() ? u.newValue : n)
          await execute('UPDATE timeline_events SET characters = ? WHERE id = ?', [JSON.stringify(updated), te.id])
        }

        const chapters = await queryAll<{ id: string; characters_appearing: string }>(
          'SELECT id, characters_appearing FROM chapters WHERE book_id = ?',
          [params.id]
        )
        for (const ch of chapters) {
          let names: string[] = []
          try { names = JSON.parse(ch.characters_appearing) } catch { continue }
          if (!names.some((n) => n.toLowerCase() === oldName.toLowerCase())) continue
          const updated = names.map((n) => n.toLowerCase() === oldName.toLowerCase() ? u.newValue : n)
          await execute('UPDATE chapters SET characters_appearing = ? WHERE id = ?', [JSON.stringify(updated), ch.id])
        }
      } else if (['description', 'status', 'arc_status'].includes(u.field)) {
        await execute(
          `UPDATE characters SET ${u.field} = ?, updated_at = ? WHERE id = ?`,
          [u.newValue, now, char.id]
        )
      } else {
        let data: Record<string, unknown> = {}
        try { data = JSON.parse(char.data) } catch { /* ok */ }
        data[u.field] = u.newValue
        await execute('UPDATE characters SET data = ?, updated_at = ? WHERE id = ?', [JSON.stringify(data), now, char.id])
      }
    }

    // ── Chapter summary updates ───────────────────────────────────────────────
    for (const u of diff.chapterSummaryUpdates ?? []) {
      const chapter = await queryFirst<{ id: string; summary: string | null; correction_notes: string }>(
        'SELECT id, summary, correction_notes FROM chapters WHERE book_id = ? AND number = ?',
        [params.id, u.chapterNumber]
      )
      if (!chapter) continue

      const newSummary = chapter.summary
        ? chapter.summary.replace(u.oldSentence, u.newSentence)
        : u.newSentence

      let notes: Array<unknown> = []
      try { notes = JSON.parse(chapter.correction_notes ?? '[]') } catch { /* ok */ }
      notes.push({
        id: generateId(),
        summary: correctionData.summary,
        appliedAt: new Date().toISOString(),
        worldMessageId,
      })

      await execute(
        'UPDATE chapters SET summary = ?, correction_notes = ?, updated_at = ? WHERE id = ?',
        [newSummary, JSON.stringify(notes), now, chapter.id]
      )
    }

    // ── Resolve flags ─────────────────────────────────────────────────────────
    for (const flagId of diff.flagsToResolve ?? []) {
      await execute(
        'UPDATE continuity_flags SET resolved = 1, resolved_by = ? WHERE id = ? AND book_id = ?',
        [worldMessageId, flagId, params.id]
      )
    }

    // ── Create CorrectionRecord ───────────────────────────────────────────────
    const correctionRecordId = generateId()
    await execute(
      `INSERT INTO correction_records (id, book_id, world_message_id, summary, affected_entities, diff, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [correctionRecordId, params.id, worldMessageId, correctionData.summary, JSON.stringify(correctionData.affectedEntities), JSON.stringify(diff), now]
    )

    await execute("UPDATE chat_messages SET correction_status = 'confirmed' WHERE id = ?", [worldMessageId])
    await execute('UPDATE books SET updated_at = ? WHERE id = ?', [now, params.id])

    return NextResponse.json({ success: true, correctionRecordId })
  } catch (err) {
    console.error('[correction/confirm] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
