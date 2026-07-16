"use server";

import { auth } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const getAppUrl = () => {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
};

export async function createCheckoutSession() {
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) {
    throw new Error("Não autorizado");
  }

  const stripe = getStripe();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) throw new Error("Usuário não encontrado");

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
        price: process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${getAppUrl()}/dashboard/settings?success=true`,
    cancel_url: `${getAppUrl()}/dashboard/settings?canceled=true`,
    client_reference_id: user.id,
  });

  if (!stripeSession.url) throw new Error("Erro ao gerar link de checkout");
  
  redirect(stripeSession.url);
}

export async function createPortalSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const stripe = getStripe();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
    throw new Error("Nenhuma assinatura encontrada");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getAppUrl()}/dashboard/settings`,
  });

  redirect(portalSession.url);
}
