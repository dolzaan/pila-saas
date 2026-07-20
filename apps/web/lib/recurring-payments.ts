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
};

export async function confirmRecurringPayment({
  userId,
  recurringTransactionId,
  expectedDueDate,
  amount,
  financialAccountId,
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
          userId: true,
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

      if (recurring.nextDate.getTime() !== expectedDate.getTime()) {
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
      const existingTransaction = await transaction.transaction.findFirst({
        where: {
          recurringTransactionId: recurring.id,
          occurredAt: recurring.nextDate,
        },
        select: { id: true },
      });

      const transactionRecord =
        existingTransaction ||
        (await transaction.transaction.create({
          data: {
            userId,
            categoryId: recurring.categoryId,
            financialAccountId: normalizedAccountId,
            amount: paidAmount,
            kind: recurring.kind,
            description: recurring.description || "Transação recorrente",
            occurredAt: recurring.nextDate,
            source: "recurring",
            recurringTransactionId: recurring.id,
          },
          select: { id: true },
        }));

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
        throw new RecurringPaymentError(
          "Este vencimento já foi atualizado. Recarregue a página antes de confirmar novamente.",
          "STALE_OCCURRENCE",
        );
      }

      return {
        success: true as const,
        alreadyRecorded: Boolean(existingTransaction),
        transactionId: transactionRecord.id,
        description: recurring.description || "Transação recorrente",
        amount: paidAmount,
        paidDueDate: recurring.nextDate,
        nextDate,
        reachedEnd:
          Boolean(recurring.endDate) &&
          nextDate.getTime() > recurring.endDate!.getTime(),
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 10_000,
    },
  );
}
