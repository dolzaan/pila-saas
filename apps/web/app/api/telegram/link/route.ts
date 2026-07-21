import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTelegramBotUsername, isTelegramConfigured } from "@/lib/telegram";

const TELEGRAM_LINK_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_PROVIDER = "telegram";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram ainda não foi configurado no servidor" },
      { status: 503 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { whatsappNumber: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  if (!user.whatsappNumber) {
    return NextResponse.json(
      { error: "Vincule seu WhatsApp antes de ativar o canal de contingência" },
      { status: 409 },
    );
  }

  const identifier = `telegram-link:${session.user.id}`;
  const token = randomBytes(18).toString("base64url");
  const expires = new Date(Date.now() + TELEGRAM_LINK_TTL_MS);

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token, expires },
    }),
  ]);

  const botUsername = getTelegramBotUsername();
  return NextResponse.json({
    telegramUrl: `https://t.me/${botUsername}?start=${token}`,
    expiresAt: expires.toISOString(),
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.account.deleteMany({
      where: { userId: session.user.id, provider: TELEGRAM_PROVIDER },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: `telegram-link:${session.user.id}` },
    }),
  ]);

  return NextResponse.json({ success: true });
}
