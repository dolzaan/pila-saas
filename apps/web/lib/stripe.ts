import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(apiKey, {
    appInfo: {
      name: "FinZap",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
