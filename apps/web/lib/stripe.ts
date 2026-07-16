import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  appInfo: {
    name: "FinZap",
    version: "0.1.0",
  },
});
