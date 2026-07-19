"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimits,
  privateRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { ChangePasswordSchema } from "@/lib/security";
import { revalidatePath } from "next/cache";

const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_CHANGE_LIMIT = 5;

export async function changePassword(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword")?.toString() || undefined,
    newPassword: formData.get("newPassword")?.toString(),
    confirmPassword: formData.get("confirmPassword")?.toString(),
  });
  if (!parsed.success) {
    return { error: "Revise os campos da senha.", details: parsed.error.format() };
  }

  try {
    const rateLimit = await checkRateLimits([
      {
        key: privateRateLimitKey("security:password-change", session.user.id),
        limit: PASSWORD_CHANGE_LIMIT,
        windowMs: PASSWORD_CHANGE_WINDOW_MS,
      },
    ]);
    if (!rateLimit.allowed) {
      return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) return { error: "Usuário não encontrado." };
    if (!user.passwordHash) {
      return {
        error: "Crie a primeira senha pelo link enviado ao seu e-mail verificado.",
      };
    }
    if (!parsed.data.currentPassword) return { error: "Informe sua senha atual." };

    const currentPasswordIsValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordIsValid) return { error: "A senha atual está incorreta." };

    const repeatedPassword = await bcrypt.compare(
      parsed.data.newPassword,
      user.passwordHash,
    );
    if (repeatedPassword) return { error: "A nova senha deve ser diferente da atual." };

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.session.deleteMany({ where: { userId: session.user.id } }),
      prisma.securityEvent.create({
        data: {
          userId: session.user.id,
          type: "PASSWORD_CHANGED",
        },
      }),
    ]);

    revalidatePath("/dashboard/security");
    return { success: true, signOut: true };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return { error: "A proteção contra tentativas está indisponível. Tente novamente em instantes." };
    }
    console.error("[changePassword]", error);
    return { error: "Não foi possível atualizar a senha." };
  }
}

export async function revokeAllSessions() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { sessionVersion: { increment: 1 } },
      }),
      prisma.session.deleteMany({ where: { userId: session.user.id } }),
      prisma.securityEvent.create({
        data: {
          userId: session.user.id,
          type: "SESSIONS_REVOKED",
        },
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[revokeAllSessions]", error);
    return { error: "Não foi possível encerrar as sessões." };
  }
}
