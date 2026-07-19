import Stripe from "stripe";
import { getExternalTimeoutMs } from "@/lib/external-service";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient ??= new Stripe(apiKey, {
    timeout: getExternalTimeoutMs("STRIPE_TIMEOUT_MS", 20_000),
    maxNetworkRetries: 2,
    appInfo: {
      name: "FinZap",
      version: "0.1.0",
    },
  });

  return stripeClient;
}
