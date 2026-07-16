import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

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
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    // Recupera os dados da assinatura completa
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const userId = session.client_reference_id;
    if (!userId) return new NextResponse("No user ID", { status: 400 });

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        stripeSubscriptionId: subscription.id,
        status: "ACTIVE",
        plan: "pro",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        status: "ACTIVE",
        plan: "pro",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  if (event.type === "invoice.payment_succeeded") {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = await stripe.subscriptions.retrieve(
      (event.data.object as Stripe.Subscription).id
    );

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
      },
    });
  }

  return new NextResponse(null, { status: 200 });
}
