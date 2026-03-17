/**
 * One-time Stripe product & price setup.
 * Run with: pnpm stripe:setup
 *
 * Idempotent — if products already exist, reuses them.
 * Logs the price IDs to add to .env.local.
 */

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Missing STRIPE_SECRET_KEY in environment. Set it in .env.local first.");
  process.exit(1);
}

const stripe = new Stripe(key, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

async function findOrCreateProduct(name: string, description: string): Promise<Stripe.Product> {
  const existing = await stripe.products.list({ limit: 100, active: true });
  const found = existing.data.find((p) => p.name === name);
  if (found) {
    console.log(`Found existing product "${name}": ${found.id}`);
    return found;
  }
  const created = await stripe.products.create({ name, description });
  console.log(`Created product "${name}": ${created.id}`);
  return created;
}

async function findOrCreatePrice(
  productId: string,
  amountCents: number,
  label: string,
): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const found = prices.data.find(
    (p) =>
      p.unit_amount === amountCents &&
      p.currency === "usd" &&
      p.recurring?.interval === "month",
  );

  if (found) {
    console.log(`Found existing ${label} price: ${found.id}`);
    return found;
  }

  const created = await stripe.prices.create({
    product: productId,
    unit_amount: amountCents,
    currency: "usd",
    recurring: { interval: "month" },
  });
  console.log(`Created ${label} price: ${created.id}`);
  return created;
}

async function main() {
  // Pro — $149/month
  const proProduct = await findOrCreateProduct(
    "Stackteryx Pro",
    "Unlimited services, clients, AI generations, exports, CTO briefs, and team members.",
  );
  const proPrice = await findOrCreatePrice(proProduct.id, 14900, "Pro");

  // Enterprise — $399/month
  const entProduct = await findOrCreateProduct(
    "Stackteryx Enterprise",
    "Everything in Pro plus white-labeling, priority support, and dedicated onboarding.",
  );
  const entPrice = await findOrCreatePrice(entProduct.id, 39900, "Enterprise");

  console.log("\n========================================");
  console.log("Add these to your .env.local:");
  console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
  console.log(`STRIPE_ENTERPRISE_PRICE_ID=${entPrice.id}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Stripe setup failed:", err);
  process.exit(1);
});
