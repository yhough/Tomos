import Stripe from 'stripe'

let _stripe: Stripe | undefined

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

// Keep `stripe` as a lazy proxy so existing call sites don't need to change
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string]
  },
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
