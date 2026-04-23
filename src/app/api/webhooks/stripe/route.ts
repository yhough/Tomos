import { stripe } from '@/lib/stripe'
import { execute } from '@/db'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

async function setPro(userId: string) {
  await execute(`UPDATE users SET plan = 'pro' WHERE id = ?`, [userId])
}

async function setFree(userId: string) {
  await execute(`UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = ?`, [userId])
}

async function setFreeByCustomer(customerId: string) {
  await execute(
    `UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE stripe_customer_id = ?`,
    [customerId]
  )
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (userId) await setPro(userId)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) {
        const active = sub.status === 'active' || sub.status === 'trialing'
        await (active ? setPro(userId) : setFree(userId))
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) await setFree(userId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (customerId) await setFreeByCustomer(customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
