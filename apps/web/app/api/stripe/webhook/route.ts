import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  if (!currentPeriodEnd) {
    throw new Error("Subscription period end not found");
  }

  return new Date(currentPeriodEnd * 1000);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
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

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: subscription.id,
        status: "ACTIVE",
        plan: "pro",
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        status: "ACTIVE",
        plan: "pro",
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof invoiceSubscription === "string"
        ? invoiceSubscription
        : invoiceSubscription?.id;

    if (!subscriptionId) {
      return new NextResponse("No subscription ID", { status: 400 });
    }

    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription;

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: getCurrentPeriodEnd(subscription),
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
