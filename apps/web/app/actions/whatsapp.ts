"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";

// Gera um PIN de 6 dígitos aleatórios
function generatePin(): string {
  return randomInt(100000, 1000000).toString();
}

export async function generateWhatsappLinkCode() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const userId = session.user.id;

  try {
    // Apaga códigos anteriores do usuário para não acumular lixo
    await prisma.whatsappLinkCode.deleteMany({
      where: { userId },
    });

    const code = generatePin();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Expira em 10 minutos

    await prisma.whatsappLinkCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    });

    revalidatePath("/dashboard/whatsapp");
    return { success: true, code };
  } catch (error) {
    console.error("Erro ao gerar PIN do WhatsApp:", error);
    return { error: "Erro interno ao gerar o código. Tente novamente." };
  }
}

export async function unlinkWhatsapp() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        whatsappNumber: null,
        whatsappVerifiedAt: null
      },
    });

    revalidatePath("/dashboard/whatsapp");
    return { success: true };
  } catch (error) {
    console.error("Erro ao desvincular WhatsApp:", error);
    return { error: "Erro interno ao desvincular conta." };
  }
}
