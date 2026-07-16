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

  await prisma.recurringTransaction.create({
    data: {
      userId: session.user.id,
      amount: data.amount,
      kind: data.kind,
      description: data.description,
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
