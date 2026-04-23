import { queryAll } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const messages = await queryAll<{
    id: string
    role: string
    content: string
    metadata: string
    created_at: number
    correction_status: string | null
    correction_data: string | null
  }>(
    `SELECT id, role, content, metadata, created_at, correction_status, correction_data
     FROM chat_messages
     WHERE book_id = ? AND character_id IS NULL
     ORDER BY created_at ASC`,
    [params.id]
  )

  const withRipples = await Promise.all(
    messages.map(async (msg) => {
      const ripples = await queryAll(
        `SELECT id, title, description, status FROM ripple_cards
         WHERE message_id = ? ORDER BY created_at ASC`,
        [msg.id]
      )
      return { ...msg, ripple_cards: ripples }
    })
  )

  return NextResponse.json(withRipples)
}
