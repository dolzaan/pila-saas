import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { asaasGateway } from "@/lib/payments/asaas";

const RequestSchema = z.object({
  cpfCnpj: z.string().regex(/^\d{11}$|^\d{14}$/),
});

function getMonthlyValue(): number {
  const value = Number(process.env.ASAAS_PRO_MONTHLY_VALUE);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("ASAAS_PRO_MONTHLY_VALUE não configurado corretamente");
  }
  return Math.round(value * 100) / 100;
}

function getAppUrl(): string {
  const value = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!value) throw new Error("APP_URL não configurada");
  return value.replace(/\/$/, "");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um CPF ou CNPJ válido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      whatsappNumber: true,
      subscription: { select: { currentPeriodEnd: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  try {
    const now = new Date();
    const nextDueDate =
      user.subscription?.currentPeriodEnd && user.subscription.currentPeriodEnd > now
        ? user.subscription.currentPeriodEnd
        : now;
    const appUrl = getAppUrl();

    const checkout = await asaasGateway.createRecurringCheckout({
      value: getMonthlyValue(),
      nextDueDate: formatDate(nextDueDate),
      externalReference: user.id,
      customerData: {
        name: user.name || user.email,
        email: user.email,
        cpfCnpj: parsed.data.cpfCnpj,
        phone: user.whatsappNumber || undefined,
      },
      callback: {
        successUrl: `${appUrl}/dashboard/settings?payment=success#subscription`,
        cancelUrl: `${appUrl}/dashboard/settings?payment=canceled#subscription`,
        expiredUrl: `${appUrl}/dashboard/settings?payment=expired#subscription`,
      },
    });

    return NextResponse.json({ checkoutId: checkout.id, checkoutUrl: checkout.link });
  } catch (error) {
    console.error("[billing.asaas.checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao abrir o checkout" },
      { status: 502 },
    );
  }
}
