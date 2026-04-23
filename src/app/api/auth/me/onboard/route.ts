import { getCurrentUser } from '@/lib/auth'
import { execute } from '@/db'
import { NextResponse } from 'next/server'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await execute('UPDATE users SET onboarded = 1 WHERE id = ?', [user.id])
  return NextResponse.json({ ok: true })
}
