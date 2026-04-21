import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function getOrCreateStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const { db } = await import('@/db')
  const user = db.prepare(`SELECT stripe_customer_id FROM users WHERE id = ?`).get(userId) as
    | { stripe_customer_id: string | null }
    | undefined

  if (user?.stripe_customer_id) return user.stripe_customer_id

  const customer = await stripe.customers.create({ email, name, metadata: { userId } })
  db.prepare(`UPDATE users SET stripe_customer_id = ? WHERE id = ?`).run(customer.id, userId)
  return customer.id
}
