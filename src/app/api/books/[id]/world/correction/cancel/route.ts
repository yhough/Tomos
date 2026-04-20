import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { worldMessageId } = await req.json() as { worldMessageId: string }

    db.prepare(
      "UPDATE chat_messages SET correction_status = 'cancelled' WHERE id = ? AND book_id = ?"
    ).run(worldMessageId, params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[correction/cancel] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
