import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { confirmRecurringPayment } from "@/lib/recurring-payments";

export class BillReminderPaymentError extends Error {
  constructor(message: string, readonly code: "NOT_FOUND") {
    super(message);
    this.name = "BillReminderPaymentError";
  }
}

/**
 * Registra o pagamento do lembrete e a despesa correspondente uma única vez.
 * Este serviço é compartilhado pelo painel e pelos canais de atendimento.
 */
export async function recordBillReminderPayment(
  userId: string,
  reminderId: string,
  paidAt = new Date(),
) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext(${`bill-reminder-payment:${reminderId}`}))
    `);

    const reminder = await transaction.billReminder.findFirst({
      where: { id: reminderId, userId },
      select: {
        id: true,
        description: true,
        amount: true,
        dueDate: true,
        isPaid: true,
      },
    });

    if (!reminder) {
      throw new BillReminderPaymentError("Lembrete não encontrado.", "NOT_FOUND");
    }

    if (reminder.isPaid) {
      const existing = await transaction.transaction.findUnique({
        where: {
          userId_importFingerprint: {
            userId,
            importFingerprint: `bill-reminder-payment:${reminder.id}`,
          },
        },
        select: { id: true },
      });
      return {
        success: true as const,
        transactionId: existing?.id ?? null,
        alreadyRecorded: true,
      };
    }

    const recurring = await transaction.recurringTransaction.findFirst({
      where: {
        userId,
        description: reminder.description,
        amount: reminder.amount,
        nextDate: reminder.dueDate,
      },
      select: { id: true },
    });

    if (recurring) {
      const result = await confirmRecurringPayment({
        userId,
        recurringTransactionId: recurring.id,
        expectedDueDate: reminder.dueDate,
        amount: reminder.amount.toNumber(),
        paidAt,
        transaction,
      });
      return {
        success: true as const,
        transactionId: result.transactionId,
        alreadyRecorded: result.alreadyRecorded,
      };
    }

    const paymentFingerprint = `bill-reminder-payment:${reminder.id}`;
    const existing = await transaction.transaction.findUnique({
      where: {
        userId_importFingerprint: { userId, importFingerprint: paymentFingerprint },
      },
      select: { id: true },
    });
    const transactionRecord = existing || await transaction.transaction.create({
      data: {
        userId,
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

    return {
      success: true as const,
      transactionId: transactionRecord.id,
      alreadyRecorded: Boolean(existing),
    };
  }, {
    maxWait: 5_000,
    timeout: 20_000,
  });
}
