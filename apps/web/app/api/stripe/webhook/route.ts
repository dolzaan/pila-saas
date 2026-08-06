import { getStripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getCurrentPeriodEnd,
  getInvoiceSubscriptionId,
  mapStripeSubscriptionStatus,
} from "@/lib/stripe-subscription";
import { applyOrderedSubscriptionState } from "@/lib/payments/subscription-state";

async function syncSubscription(
  subscription: Stripe.Subscription,
  eventId: string,
  eventAt: Date,
  explicitUserId?: string | null,
) {
  const userId = explicitUserId || subscription.metadata.userId;
  const status = mapStripeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  await applyOrderedSubscriptionState({
    provider: "stripe",
    eventId,
    eventAt,
    providerSubscriptionId: subscription.id,
    userId,
    status,
    currentPeriodEnd,
    createWhenMissing: Boolean(userId),
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new NextResponse("Stripe webhook is not configured", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Stripe Webhook Error]", message);
    return new NextResponse(`Webhook Error: ${message}`, {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const subscription = (await stripe.subscriptions.retrieve(
      session.subscription as string
    )) as Stripe.Subscription;

    const userId = session.client_reference_id;

    if (!userId) {
      return new NextResponse("No user ID", { status: 400 });
    }

    await syncSubscription(subscription, event.id, new Date(), userId);
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (!subscriptionId) {
      return new NextResponse("No subscription ID", { status: 400 });
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription;

    await syncSubscription(subscription, event.id, new Date());
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (subscriptionId) {
      await applyOrderedSubscriptionState({
        provider: "stripe",
        eventId: event.id,
        eventAt: new Date(event.created * 1_000),
        providerSubscriptionId: subscriptionId,
        status: "PAST_DUE",
      });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const eventSubscription = event.data.object as Stripe.Subscription;
    const currentSubscription = (await stripe.subscriptions.retrieve(
      eventSubscription.id,
    )) as Stripe.Subscription;
    await syncSubscription(currentSubscription, event.id, new Date());
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await applyOrderedSubscriptionState({
      provider: "stripe",
      eventId: event.id,
      eventAt: new Date(event.created * 1_000),
      providerSubscriptionId: subscription.id,
      status: "CANCELED",
      currentPeriodEnd: getCurrentPeriodEnd(subscription),
    });
  }

  return new NextResponse(null, { status: 200 });
}
