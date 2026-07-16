"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

export async function createTransaction(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const amountStr = formData.get("amount")?.toString();
  const kind = formData.get("kind")?.toString();
  const description = formData.get("description")?.toString();
  const categoryId = formData.get("categoryId")?.toString() || undefined;
  const occurredAt = formData.get("occurredAt")?.toString() || undefined;

  const amount = amountStr ? parseFloat(amountStr.replace(",", ".")) : 0;

  const parsed = TransactionSchema.safeParse({
    amount,
    kind,
    description,
    categoryId,
    occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
  });

  if (!parsed.success) {
    return { error: "Dados inválidos.", details: parsed.error.format() };
  }

  try {
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: parsed.data.amount,
        kind: parsed.data.kind,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        source: "manual",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[createTransaction]", error);
    return { error: "Erro interno ao criar transação." };
  }
}

export async function updateTransaction(id: string, prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const amountStr = formData.get("amount")?.toString();
  const kind = formData.get("kind")?.toString();
  const description = formData.get("description")?.toString();
  const categoryId = formData.get("categoryId")?.toString() || undefined;
  const occurredAt = formData.get("occurredAt")?.toString() || undefined;

  const amount = amountStr ? parseFloat(amountStr.replace(",", ".")) : 0;

  const parsed = TransactionSchema.safeParse({
    amount,
    kind,
    description,
    categoryId,
    occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
  });

  if (!parsed.success) {
    return { error: "Dados inválidos.", details: parsed.error.format() };
  }

  try {
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== session.user.id) {
      return { error: "Transação não encontrada ou acesso negado." };
    }

    await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsed.data.amount,
        kind: parsed.data.kind,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[updateTransaction]", error);
    return { error: "Erro interno ao atualizar transação." };
  }
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  try {
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== session.user.id) {
      return { error: "Transação não encontrada ou acesso negado." };
    }

    await prisma.transaction.delete({ where: { id } });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[deleteTransaction]", error);
    return { error: "Erro interno ao excluir transação." };
  }
}
