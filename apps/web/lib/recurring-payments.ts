import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getNextRecurringDate } from "@/lib/recurring";

export class RecurringPaymentError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_AMOUNT"
      | "INVALID_DATE"
      | "NOT_FOUND"
      | "INVALID_ACCOUNT"
      | "ENDED"
      | "STALE_OCCURRENCE",
  ) {
    super(message);
    this.name = "RecurringPaymentError";
  }
}

type ConfirmRecurringPaymentInput = {
  userId: string;
  recurringTransactionId: string;
  expectedDueDate: Date | string;
  amount?: number;
  financialAccountId?: string | null;
  paidAt?: Date;
};

export async function confirmRecurringPayment({
  userId,
  recurringTransactionId,
  expectedDueDate,
  amount,
  financialAccountId,
  paidAt = new Date(),
}: ConfirmRecurringPaymentInput) {
  const expectedDate =
    expectedDueDate instanceof Date
      ? expectedDueDate
      : new Date(expectedDueDate);

  if (Number.isNaN(expectedDate.getTime())) {
    throw new RecurringPaymentError(
      "A data deste vencimento não é válida.",
      "INVALID_DATE",
    );
  }
  if (Number.isNaN(paidAt.getTime())) {
    throw new RecurringPaymentError(
      "A data do pagamento não é válida.",
      "INVALID_DATE",
    );
  }

  if (
    amount !== undefined &&
    (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
  ) {
    throw new RecurringPaymentError(
      "Informe um valor de pagamento válido.",
      "INVALID_AMOUNT",
    );
  }

  return prisma.$transaction(
    async (transaction) => {
      const recurring = await transaction.recurringTransaction.findFirst({
        where: { id: recurringTransactionId, userId },
        select: {
          id: true,
          amount: true,
          kind: true,
          description: true,
          categoryId: true,
          interval: true,
          nextDate: true,
          endDate: true,
        },
      });

      if (!recurring) {
        throw new RecurringPaymentError(
          "Conta recorrente não encontrada.",
          "NOT_FOUND",
        );
      }

      if (
        recurring.endDate &&
        recurring.nextDate.getTime() > recurring.endDate.getTime()
      ) {
        throw new RecurringPaymentError(
          "Esta conta recorrente já chegou à data final.",
          "ENDED",
        );
      }

      const paymentFingerprint = `recurring-payment:${recurring.id}:${expectedDate.toISOString()}`;
      const existingPayment = await transaction.transaction.findUnique({
        where: {
          userId_importFingerprint: {
            userId,
            importFingerprint: paymentFingerprint,
          },
        },
        select: { id: true },
      });

      if (recurring.nextDate.getTime() !== expectedDate.getTime()) {
        if (existingPayment) {
          return {
            success: true as const,
            alreadyRecorded: true,
            transactionId: existingPayment.id,
            description: recurring.description || "Transação recorrente",
            amount: amount ?? recurring.amount.toNumber(),
            paidDueDate: expectedDate,
            paidAt,
            nextDate: recurring.nextDate,
            reachedEnd:
              Boolean(recurring.endDate) &&
              recurring.nextDate.getTime() > recurring.endDate!.getTime(),
          };
        }

        throw new RecurringPaymentError(
          "Este vencimento já foi atualizado. Recarregue a página antes de confirmar novamente.",
          "STALE_OCCURRENCE",
        );
      }

      const normalizedAccountId = financialAccountId?.trim() || null;
      if (normalizedAccountId) {
        const account = await transaction.financialAccount.findFirst({
          where: {
            id: normalizedAccountId,
            userId,
            isArchived: false,
          },
          select: { id: true },
        });
        if (!account) {
          throw new RecurringPaymentError(
            "A conta selecionada não está disponível.",
            "INVALID_ACCOUNT",
          );
        }
      }

      const paidAmount = amount ?? recurring.amount.toNumber();
      const transactionRecord = await transaction.transaction.upsert({
        where: {
          userId_importFingerprint: {
            userId,
            importFingerprint: paymentFingerprint,
          },
        },
        update: {},
        create: {
          userId,
          categoryId: recurring.categoryId,
          financialAccountId: normalizedAccountId,
          amount: paidAmount,
          kind: recurring.kind,
          description: recurring.description || "Transação recorrente",
          occurredAt: paidAt,
          source: "recurring",
          recurringTransactionId: recurring.id,
          importFingerprint: paymentFingerprint,
        },
        select: { id: true },
      });

      const nextDate = getNextRecurringDate(
        recurring.nextDate,
        recurring.interval,
      );
      const updated = await transaction.recurringTransaction.updateMany({
        where: {
          id: recurring.id,
          userId,
          nextDate: recurring.nextDate,
        },
        data: { nextDate },
      });

      if (updated.count === 0) {
        const currentRecurring = await transaction.recurringTransaction.findFirst({
          where: { id: recurring.id, userId },
          select: { nextDate: true },
        });

        return {
          success: true as const,
          alreadyRecorded: true,
          transactionId: transactionRecord.id,
          description: recurring.description || "Transação recorrente",
          amount: paidAmount,
          paidDueDate: recurring.nextDate,
          paidAt,
          nextDate: currentRecurring?.nextDate || nextDate,
          reachedEnd:
            Boolean(recurring.endDate) &&
            (currentRecurring?.nextDate || nextDate).getTime() >
              recurring.endDate!.getTime(),
        };
      }

      const description = recurring.description || "Transação recorrente";

      await transaction.billReminder.updateMany({
        where: {
          userId,
          description,
          dueDate: recurring.nextDate,
          isPaid: false,
        },
        data: {
          isPaid: true,
          paidAt,
          snoozedUntil: null,
        },
      });

      const reachedEnd =
        Boolean(recurring.endDate) &&
        nextDate.getTime() > recurring.endDate!.getTime();

      if (!reachedEnd) {
        const nextReminder = await transaction.billReminder.findFirst({
          where: {
            userId,
            description,
            dueDate: nextDate,
            isPaid: false,
          },
          select: { id: true },
        });

        if (!nextReminder) {
          await transaction.billReminder.create({
            data: {
              userId,
              description,
              amount: recurring.amount,
              dueDate: nextDate,
            },
          });
        }
      }

      return {
        success: true as const,
        alreadyRecorded: Boolean(existingPayment),
        transactionId: transactionRecord.id,
        description,
        amount: paidAmount,
        paidDueDate: recurring.nextDate,
        paidAt,
        nextDate,
        reachedEnd,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
}