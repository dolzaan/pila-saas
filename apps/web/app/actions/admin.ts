"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cancelBillingBeforeAccountDeletion } from "@/lib/account-deletion";
import type { Prisma } from "@prisma/client";

const ADMIN_MUTATION_MAX_RETRIES = 3;

function isTransactionWriteConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2034"
  );
}

async function runSerializableAdminMutation<T>(
  mutation: (transaction: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= ADMIN_MUTATION_MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(mutation, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        !isTransactionWriteConflict(error) ||
        attempt === ADMIN_MUTATION_MAX_RETRIES
      ) {
        throw error;
      }
    }
  }

  throw new Error("Não foi possível concluir a operação administrativa.");
}

// Valida a sessão e o papel atual no banco para não confiar em um JWT desatualizado.
async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error(
      "Não autorizado. Apenas administradores podem acessar este recurso."
    );
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== "ADMIN") {
    throw new Error(
      "Não autorizado. Apenas administradores podem acessar este recurso."
    );
  }

  return session;
}

async function assertAdminCanBeRemoved(
  transaction: Prisma.TransactionClient,
  userId: string
) {
  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  if (user.role !== "ADMIN") {
    return;
  }

  const adminCount = await transaction.user.count({
    where: { role: "ADMIN" },
  });

  if (adminCount <= 1) {
    throw new Error(
      "Não é possível rebaixar ou excluir o último administrador."
    );
  }
}

export async function getUsers() {
  await checkAdmin();

  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          plan: true,
          currentPeriodEnd: true,
        },
      },
    },
  });
}

export async function updateUserRole(
  userId: string,
  role: "USER" | "ADMIN"
) {
  await checkAdmin();

  await runSerializableAdminMutation(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    if (user.role === role) {
      return;
    }

    if (user.role === "ADMIN" && role === "USER") {
      await assertAdminCanBeRemoved(transaction, userId);
    }

    await transaction.user.update({
      where: { id: userId },
      data: {
        role,
        sessionVersion: { increment: 1 },
      },
    });
  });

  revalidatePath("/admin");
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
) {
  await checkAdmin();

  if (newPassword.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });

  revalidatePath("/admin");
}

export async function updateSubscriptionStatus(
  userId: string,
  status: "ACTIVE" | "INACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED",
  plan: string
) {
  await checkAdmin();

  // Upsert the subscription
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      status,
      plan,
    },
    create: {
      userId,
      stripeSubscriptionId: `manual_${Date.now()}_${userId}`,
      status,
      plan,
    },
  });

  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  const session = await checkAdmin();

  if (session.user.id === userId) {
    throw new Error(
      "Não é permitido excluir sua própria conta administrativa por esta tela."
    );
  }

  // Evita cancelar a cobrança do último administrador em uma operação inválida.
  await runSerializableAdminMutation(async (transaction) => {
    await assertAdminCanBeRemoved(transaction, userId);
  });

  await cancelBillingBeforeAccountDeletion(userId);

  // A segunda validação fecha a janela entre a chamada externa e a exclusão.
  await runSerializableAdminMutation(async (transaction) => {
    await assertAdminCanBeRemoved(transaction, userId);
    await transaction.user.delete({
      where: { id: userId },
    });
  });

  revalidatePath("/admin");
}
