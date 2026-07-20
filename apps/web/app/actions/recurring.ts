"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  confirmRecurringPayment,
  RecurringPaymentError,
} from "@/lib/recurring-payments";
import { revalidatePath } from "next/cache";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";

function revalidateRecurringPaymentPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/recurring");
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/reports");
}

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
  if (Number.isNaN(data.startDate.getTime())) {
    throw new Error("Data de vencimento inválida");
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

  const description = data.description.trim();

  await prisma.$transaction(async (transaction) => {
    await transaction.recurringTransaction.create({
      data: {
        userId: session.user.id,
        amount: data.amount,
        kind: data.kind,
        description,
        categoryId: data.categoryId,
        interval: data.interval,
        startDate: data.startDate,
        nextDate: data.startDate,
      },
    });

    const existingReminder = await transaction.billReminder.findFirst({
      where: {
        userId: session.user.id,
        description,
        dueDate: data.startDate,
        isPaid: false,
      },
      select: { id: true },
    });

    if (!existingReminder) {
      await transaction.billReminder.create({
        data: {
          userId: session.user.id,
          description,
          amount: data.amount,
          dueDate: data.startDate,
        },
      });
    }
  });

  revalidateRecurringPaymentPages();
}

export async function markRecurringTransactionPaid(
  id: string,
  expectedDueDate: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const amountInput = formData.get("amount")?.toString().trim();
  const amount = amountInput
    ? Number(amountInput.replace(",", "."))
    : undefined;
  const financialAccountId =
    formData.get("financialAccountId")?.toString() || null;

  try {
    const result = await confirmRecurringPayment({
      userId: session.user.id,
      recurringTransactionId: id,
      expectedDueDate,
      amount,
      financialAccountId,
    });
    revalidateRecurringPaymentPages();
    return {
      success: true,
      nextDate: result.nextDate.toISOString(),
      alreadyRecorded: result.alreadyRecorded,
    };
  } catch (error) {
    if (error instanceof RecurringPaymentError) {
      return { error: error.message };
    }
    console.error("[markRecurringTransactionPaid]", error);
    return {
      error:
        "Não foi possível confirmar o pagamento. Atualize a página e tente novamente.",
    };
  }
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
  revalidatePath("/dashboard/planning");
}