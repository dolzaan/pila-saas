import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function secretsMatch(provided: string | null, expected: string) {
  if (!provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

async function isAuthorized(req: Request) {
  const expectedSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-pila-webhook-secret");
  if (expectedSecret && secretsMatch(providedSecret, expectedSecret)) return true;

  const session = await auth();
  return session?.user?.role === "ADMIN";
}

function normalizePhone(value: string | null) {
  return (value || "").replace(/\D/g, "");
}

async function getStatus(phone: string) {
  const now = new Date();
  const [user, onboarding] = await Promise.all([
    prisma.user.findFirst({
      where: { whatsappNumber: phone },
      select: {
        id: true,
        whatsappVerifiedAt: true,
      },
    }),
    prisma.whatsappOnboardingSession.findFirst({
      where: {
        phone,
        expiresAt: { gt: now },
      },
      select: { step: true },
    }),
  ]);

  const linked = Boolean(user?.id && user.whatsappVerifiedAt);
  return {
    linked,
    onboardingActive: Boolean(onboarding),
    accountStatus: linked ? "LINKED" : "UNLINKED",
  } as const;
}

export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (!/^\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  return NextResponse.json(await getStatus(phone), {
    headers: { "Cache-Control": "no-store" },
  });
}
