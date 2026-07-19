"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function setBudget(categoryId: string, monthlyLimit: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0 || monthlyLimit > 1_000_000_000) {
    throw new Error("Limite mensal inválido");
  }

  // A tela oferece categorias padrão do sistema e categorias do próprio usuário.
  // Categorias privadas de outras contas e categorias de receita continuam bloqueadas.
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      kind: "EXPENSE",
      OR: [
        { userId: null },
        { userId: session.user.id },
      ],
    },
    select: { id: true },
  });

  if (!category) {
    throw new Error("Categoria de despesa não encontrada ou não está disponível para o usuário");
  }

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
