import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return new Date(
    (subscription as any).current_period_end * 1000
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (error: any) {
    console.error("[Stripe Webhook Error]", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, {
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

  const subscriptionId = (invoice as any).subscription as string;

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
