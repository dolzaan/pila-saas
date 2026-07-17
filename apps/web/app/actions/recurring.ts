"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";

export async function createRecurringTransaction(data: {
  amount: number;
  kind: TransactionKind;
  description: string;
  categoryId?: string;
  interval: RecurrenceInterval;
  startDate: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount > 1_000_000_000) {
    throw new Error("Valor inválido");
  }
  if (!data.description || data.description.trim().length > 255) {
    throw new Error("Descrição inválida");
  }
  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        kind: data.kind,
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      select: { id: true },
    });
    if (!category) throw new Error("Categoria inválida ou acesso negado");
  }

  await prisma.recurringTransaction.create({
    data: {
      userId: session.user.id,
      amount: data.amount,
      kind: data.kind,
      description: data.description.trim(),
      categoryId: data.categoryId,
      interval: data.interval,
      startDate: data.startDate,
      nextDate: data.startDate, // A primeira vez será na data de início
    },
  });

  revalidatePath("/dashboard/recurring");
}

export async function deleteRecurringTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.recurringTransaction.delete({
    where: {
      id,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard/recurring");
}
