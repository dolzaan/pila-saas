import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getCurrentPeriodEnd,
  getInvoiceSubscriptionId,
  mapStripeSubscriptionStatus,
} from "@/lib/stripe-subscription";

async function syncSubscription(
  subscription: Stripe.Subscription,
  explicitUserId?: string | null
) {
  const userId = explicitUserId || subscription.metadata.userId;
  const status = mapStripeSubscriptionStatus(subscription.status);
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  if (userId) {
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: subscription.id,
        status,
        plan: "pro",
        currentPeriodEnd,
      },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        status,
        plan: "pro",
        currentPeriodEnd,
      },
    });
    return;
  }

  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: { status, currentPeriodEnd },
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

    await syncSubscription(subscription, userId);
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

    await syncSubscription(subscription);
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getInvoiceSubscriptionId(invoice);

    if (subscriptionId) {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: "PAST_DUE" },
      });
    }
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
