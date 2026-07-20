"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  confirmRecurringPayment,
  RecurringPaymentError,
} from "@/lib/recurring-payments";
import { parseReminderDate, reminderDateKey, saoPauloDateKey } from "@/lib/reminders";
import { BillReminderSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

function parseAmount(value: FormDataEntryValue | null) {
  const input = value?.toString().trim();
  if (!input) return Number.NaN;
  return Number(input.replace(",", "."));
}

function revalidateReminderPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard/recurring");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/planning");
  revalidatePath("/dashboard/reports");
}

function reminderPayload(formData: FormData) {
  return BillReminderSchema.safeParse({
    description: formData.get("description")?.toString(),
    amount: parseAmount(formData.get("amount")),
    dueDate: formData.get("dueDate")?.toString(),
  });
}

export async function createBillReminder(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = reminderPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados do lembrete.", details: parsed.error.format() };
  }

  const dueDate = parseReminderDate(parsed.data.dueDate);
  if (!dueDate) return { error: "Informe uma data de vencimento válida." };

  try {
    await prisma.billReminder.create({
      data: {
        userId: session.user.id,
        description: parsed.data.description,
        amount: parsed.data.amount,
        dueDate,
      },
    });
    revalidateReminderPages();
    return { success: true };
  } catch (error) {
    console.error("[createBillReminder]", error);
    return { error: "Não foi possível criar o lembrete." };
  }
}

export async function updateBillReminder(
  id: string,
  _state: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = reminderPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados do lembrete.", details: parsed.error.format() };
  }

  const dueDate = parseReminderDate(parsed.data.dueDate);
  if (!dueDate) return { error: "Informe uma data de vencimento válida." };

  try {
    const result = await prisma.billReminder.updateMany({
      where: { id, userId: session.user.id },
      data: {
        description: parsed.data.description,
        amount: parsed.data.amount,
        dueDate,
        snoozedUntil: null,
        lastNotifiedAt: null,
      },
    });
    if (result.count === 0) return { error: "Lembrete não encontrado." };

    revalidateReminderPages();
    return { success: true };
  } catch (error) {
    console.error("[updateBillReminder]", error);
    return { error: "Não foi possível atualizar o lembrete." };
  }
}

export async function setBillReminderPaid(id: string, isPaid: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    const reminder = await prisma.billReminder.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
        isPaid: true,
      },
    });

    if (!reminder) return { error: "Lembrete não encontrado." };

    if (isPaid) {
      const recurring = await prisma.recurringTransaction.findFirst({
        where: {
          userId: session.user.id,
          description: reminder.description,
          amount: reminder.amount,
          nextDate: reminder.dueDate,
        },
        select: { id: true },
      });

      if (recurring) {
        const result = await confirmRecurringPayment({
          userId: session.user.id,
          recurringTransactionId: recurring.id,
          expectedDueDate: reminder.dueDate,
          amount: reminder.amount.toNumber(),
        });

        revalidateReminderPages();
        return {
          success: true,
          transactionId: result.transactionId,
          alreadyRecorded: result.alreadyRecorded,
        };
      }

      const paidAt = new Date();
      const paymentFingerprint = `bill-reminder-payment:${reminder.id}`;

      const result = await prisma.$transaction(async (transaction) => {
        const transactionRecord = await transaction.transaction.upsert({
          where: {
            userId_importFingerprint: {
              userId: session.user.id,
              importFingerprint: paymentFingerprint,
            },
          },
          update: {},
          create: {
            userId: session.user.id,
            amount: reminder.amount,
            kind: "EXPENSE",
            description: reminder.description,
            occurredAt: paidAt,
            source: "reminder",
            importFingerprint: paymentFingerprint,
          },
          select: { id: true },
        });

        await transaction.billReminder.update({
          where: { id: reminder.id },
          data: {
            isPaid: true,
            paidAt,
            snoozedUntil: null,
          },
        });

        return transactionRecord;
      });

      revalidateReminderPages();
      return {
        success: true,
        transactionId: result.id,
        alreadyRecorded: reminder.isPaid,
      };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.billReminder.update({
        where: { id: reminder.id },
        data: {
          isPaid: false,
          paidAt: null,
          snoozedUntil: null,
          lastNotifiedAt: null,
        },
      });

      await transaction.transaction.deleteMany({
        where: {
          userId: session.user.id,
          importFingerprint: `bill-reminder-payment:${reminder.id}`,
        },
      });
    });

    revalidateReminderPages();
    return { success: true };
  } catch (error) {
    if (error instanceof RecurringPaymentError) {
      return { error: error.message };
    }
    console.error("[setBillReminderPaid]", error);
    return { error: "Não foi possível atualizar o pagamento do lembrete." };
  }
}

export async function snoozeBillReminder(id: string, until: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const snoozedUntil = parseReminderDate(until);
  if (!snoozedUntil || reminderDateKey(snoozedUntil) <= saoPauloDateKey()) {
    return { error: "Escolha uma data futura para adiar." };
  }

  const result = await prisma.billReminder.updateMany({
    where: { id, userId: session.user.id, isPaid: false },
    data: { snoozedUntil, lastNotifiedAt: null },
  });
  if (result.count === 0) return { error: "Lembrete pendente não encontrado." };

  revalidateReminderPages();
  return { success: true };
}

export async function deleteBillReminder(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.billReminder.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return { error: "Lembrete não encontrado." };

  revalidateReminderPages();
  return { success: true };
}
