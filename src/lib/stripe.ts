import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Returns the Stripe client, or null when Stripe is not configured. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}
