"use server";

import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isStripeSubscriptionId } from "@/lib/stripe-subscription";
import { headers } from "next/headers";

async function getAppUrl() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");

  if (origin?.startsWith("http://") || origin?.startsWith("https://")) {
    return origin.replace(/\/$/, "");
  }

  const forwardedHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (forwardedHost) {
    const protocol = requestHeaders.get("x-forwarded-proto") || "https";
    return `${protocol}://${forwardedHost}`;
  }

  const configuredUrl = process.env.APP_URL || process.env.AUTH_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getProPriceId() {
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    throw new Error("STRIPE_PRO_PRICE_ID não está configurado");
  }

  return priceId;
}

export async function createCheckoutSession() {
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const stripe = getStripe();
  const appUrl = await getAppUrl();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  if (!user) throw new Error("Usuário não encontrado");

  // Uma assinatura existente deve ser regularizada no portal, evitando
  // cobranças e assinaturas duplicadas para o mesmo usuário.
  if (
    user.stripeCustomerId &&
    user.subscription &&
    isStripeSubscriptionId(user.subscription.stripeSubscriptionId) &&
    ["ACTIVE", "TRIALING", "PAST_DUE"].includes(user.subscription.status)
  ) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard/settings`,
    });

    redirect(portalSession.url);
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const stripeSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: getProPriceId(),
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard/settings?success=true`,
    cancel_url: `${appUrl}/dashboard/settings?canceled=true`,
    client_reference_id: user.id,
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  if (!stripeSession.url) throw new Error("Erro ao gerar link de checkout");
  
  redirect(stripeSession.url);
}

export async function createPortalSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const stripe = getStripe();
  const appUrl = await getAppUrl();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("Nenhuma assinatura encontrada");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings`,
  });

  redirect(portalSession.url);
}
