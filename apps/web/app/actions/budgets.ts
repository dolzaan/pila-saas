"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setBudget(categoryId: string, monthlyLimit: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  // Verify category belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: session.user.id },
  });

  if (!category) throw new Error("Categoria não encontrada ou não pertence ao usuário");

  await prisma.budget.upsert({
    where: {
      userId_categoryId: {
        userId: session.user.id,
        categoryId: categoryId,
      },
    },
    update: {
      monthlyLimit: monthlyLimit,
    },
    create: {
      userId: session.user.id,
      categoryId: categoryId,
      monthlyLimit: monthlyLimit,
    },
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}

export async function deleteBudget(categoryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  await prisma.budget.deleteMany({
    where: {
      userId: session.user.id,
      categoryId: categoryId,
    },
  });

  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}
