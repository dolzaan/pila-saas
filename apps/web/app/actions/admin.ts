"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cancelBillingBeforeAccountDeletion } from "@/lib/account-deletion";

// Middleware simples para garantir que a action seja apenas para ADMIN
async function checkAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Não autorizado. Apenas administradores podem acessar este recurso.");
  }
}

export async function getUsers() {
  await checkAdmin();
  
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: true,
    }
  });
  
  return users;
}

export async function updateUserRole(userId: string, role: "USER" | "ADMIN") {
  await checkAdmin();
  
  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });
  
  revalidatePath("/admin");
}

export async function updateUserPassword(userId: string, newPassword: string) {
  await checkAdmin();
  
  if (newPassword.length < 8) {
    throw new Error("A senha deve ter pelo menos 8 caracteres.");
  }
  
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
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
    }
  });
  
  revalidatePath("/admin");
}

export async function deleteUser(userId: string) {
  await checkAdmin();

  const session = await auth();
  if (session?.user?.id === userId) {
    throw new Error("Não é permitido excluir sua própria conta administrativa por esta tela.");
  }

  await cancelBillingBeforeAccountDeletion(userId);
  await prisma.user.delete({
    where: { id: userId }
  });
  
  revalidatePath("/admin");
}
