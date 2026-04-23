import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function getOrCreateStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const { queryFirst, execute } = await import('@/db')
  const user = await queryFirst<{ stripe_customer_id: string | null }>(
    `SELECT stripe_customer_id FROM users WHERE id = ?`,
    [userId]
  )

  if (user?.stripe_customer_id) return user.stripe_customer_id

  const customer = await stripe.customers.create({ email, name, metadata: { userId } })
  await execute(`UPDATE users SET stripe_customer_id = ? WHERE id = ?`, [customer.id, userId])
  return customer.id
}
