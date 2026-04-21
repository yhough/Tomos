import { getCurrentUser } from '@/lib/auth'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const customerId = await getOrCreateStripeCustomer(user.id, user.email, user.name)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: `${base}/?upgraded=true`,
    cancel_url: `${base}/`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  })

  return NextResponse.json({ url: session.url })
}
