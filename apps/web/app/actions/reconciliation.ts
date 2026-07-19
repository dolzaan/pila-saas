"use server";

import { auth } from "@/lib/auth";
import {
  calculateReconciliationDifference,
  calculateStatementBalance,
  isReconciliationBalanced,
} from "@/lib/reconciliation";
import { AccountReconciliationSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ReconciliationInput = {
  accountId: string;
  statementDate: string;
  statementBalance: number;
};

function statementDateEnd(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999),
  );
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

async function reconciliationSnapshot(
  userId: string,
  input: ReconciliationInput,
  client: Pick<typeof prisma, "financialAccount" | "transaction"> = prisma,
) {
  const parsed = AccountReconciliationSchema.safeParse(input);
  if (!parsed.success) return { error: "Informe conta, data e saldo válidos." } as const;

  const statementDate = statementDateEnd(parsed.data.statementDate);
  if (!statementDate) return { error: "Data do extrato inválida." } as const;

  const account = await client.financialAccount.findFirst({
    where: { id: parsed.data.accountId, userId },
    select: { id: true, name: true, type: true, initialBalance: true },
  });
  if (!account) return { error: "Conta não encontrada." } as const;

  const [totals, unreconciledCount] = await Promise.all([
    client.transaction.groupBy({
      by: ["kind"],
      where: {
        userId,
        financialAccountId: account.id,
        occurredAt: { lte: statementDate },
      },
      _sum: { amount: true },
    }),
    client.transaction.count({
      where: {
        userId,
        financialAccountId: account.id,
        occurredAt: { lte: statementDate },
        reconciliationId: null,
      },
    }),
  ]);
  const income =
    totals.find((item) => item.kind === "INCOME")?._sum.amount?.toNumber() || 0;
  const expense =
    totals.find((item) => item.kind === "EXPENSE")?._sum.amount?.toNumber() || 0;
  const systemBalance = calculateStatementBalance(
    account.type,
    account.initialBalance.toNumber(),
    { income, expense },
  );
  const difference = calculateReconciliationDifference(
    parsed.data.statementBalance,
    systemBalance,
  );

  return {
    success: true,
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    statementDate,
    statementBalance: parsed.data.statementBalance,
    systemBalance,
    difference,
    balanced: isReconciliationBalanced(difference),
    unreconciledCount,
  } as const;
}

export async function previewAccountReconciliation(input: ReconciliationInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };
  return reconciliationSnapshot(session.user.id, input);
}

export async function confirmAccountReconciliation(input: ReconciliationInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const snapshot = await reconciliationSnapshot(
        session.user.id,
        input,
        transaction as typeof prisma,
      );
      if (!snapshot.success) return snapshot;
      if (!snapshot.balanced) {
        return {
          error: "O saldo do banco ainda não confere com o Pila.",
          difference: snapshot.difference,
        };
      }

      const existing = await transaction.accountReconciliation.findUnique({
        where: {
          financialAccountId_statementDate: {
            financialAccountId: snapshot.accountId,
            statementDate: snapshot.statementDate,
          },
        },
        select: { id: true },
      });
      if (existing) return { error: "Este extrato já foi conciliado." };

      const reconciliation = await transaction.accountReconciliation.create({
        data: {
          userId: session.user.id,
          financialAccountId: snapshot.accountId,
          statementDate: snapshot.statementDate,
          statementBalance: snapshot.statementBalance,
          systemBalance: snapshot.systemBalance,
          transactionCount: snapshot.unreconciledCount,
        },
      });
      if (snapshot.unreconciledCount > 0) {
        await transaction.transaction.updateMany({
          where: {
            userId: session.user.id,
            financialAccountId: snapshot.accountId,
            occurredAt: { lte: snapshot.statementDate },
            reconciliationId: null,
          },
          data: { reconciliationId: reconciliation.id },
        });
      }
      return {
        success: true,
        reconciled: snapshot.unreconciledCount,
        accountName: snapshot.accountName,
      };
    });

    if ("success" in result && result.success) {
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/accounts");
      revalidatePath("/dashboard/reconciliation");
      revalidatePath("/dashboard/transactions");
    }
    return result;
  } catch (error) {
    console.error("[confirmAccountReconciliation]", error);
    return { error: "Não foi possível concluir a conciliação." };
  }
}

export async function undoAccountReconciliation(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const reconciliation = await transaction.accountReconciliation.findFirst({
        where: { id, userId: session.user.id },
        select: { id: true },
      });
      if (!reconciliation) return null;

      const transactions = await transaction.transaction.updateMany({
        where: { userId: session.user.id, reconciliationId: reconciliation.id },
        data: { reconciliationId: null },
      });
      await transaction.accountReconciliation.delete({
        where: { id: reconciliation.id },
      });
      return transactions.count;
    });
    if (result === null) return { error: "Conciliação não encontrada." };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/accounts");
    revalidatePath("/dashboard/reconciliation");
    revalidatePath("/dashboard/transactions");
    return { success: true, released: result };
  } catch (error) {
    console.error("[undoAccountReconciliation]", error);
    return { error: "Não foi possível desfazer a conciliação." };
  }
}
