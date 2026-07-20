"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { cancelBillingBeforeAccountDeletion } from "@/lib/account-deletion";

type UserExportData = Prisma.UserGetPayload<{
  include: {
    transactions: true;
    categories: true;
    budgets: true;
    subscription: true;
    billReminders: true;
    recurringTransactions: true;
    financialAccounts: true;
    transactionRules: true;
    accountReconciliations: true;
    securityEvents: true;
  };
}>;

type AccountTransferExportRow = {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: Prisma.Decimal;
  description: string | null;
  occurredAt: Date;
  source: string;
  createdAt: Date;
};

export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const [user, accountTransfers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        transactions: true,
        categories: true,
        budgets: true,
        subscription: true,
        billReminders: true,
        recurringTransactions: true,
        financialAccounts: true,
        transactionRules: true,
        accountReconciliations: true,
        securityEvents: true,
      },
    }) as Promise<UserExportData | null>,
    prisma.$queryRaw<AccountTransferExportRow[]>`
      SELECT
        "sourceAccountId",
        "destinationAccountId",
        "amount",
        "description",
        "occurredAt",
        "source",
        "createdAt"
      FROM "account_transfers"
      WHERE "userId" = ${session.user.id}
      ORDER BY "occurredAt" DESC
    `,
  ]);

  if (!user) throw new Error("Usuário não encontrado");

  const exportData = {
    profile: {
      name: user.name,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      createdAt: user.createdAt,
    },
    subscription: user.subscription ? {
      plan: user.subscription.plan,
      status: user.subscription.status,
      currentPeriodEnd: user.subscription.currentPeriodEnd,
    } : null,
    categories: user.categories.map(c => ({ name: c.name, kind: c.kind, icon: c.icon })),
    budgets: user.budgets.map(b => ({ categoryId: b.categoryId, limit: b.monthlyLimit })),
    financialAccounts: user.financialAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      creditLimit: account.creditLimit,
      closingDay: account.closingDay,
      dueDay: account.dueDay,
      isArchived: account.isArchived,
      createdAt: account.createdAt,
    })),
    transactions: user.transactions.map(t => ({
      amount: t.amount,
      kind: t.kind,
      description: t.description,
      occurredAt: t.occurredAt,
      source: t.source,
      rawMessage: t.rawMessage,
      categoryId: t.categoryId,
      financialAccountId: t.financialAccountId,
      reconciliationId: t.reconciliationId,
      appliedRuleId: t.appliedRuleId,
    })),
    accountTransfers: accountTransfers.map(transfer => ({
      sourceAccountId: transfer.sourceAccountId,
      destinationAccountId: transfer.destinationAccountId,
      amount: transfer.amount,
      description: transfer.description,
      occurredAt: transfer.occurredAt,
      source: transfer.source,
      createdAt: transfer.createdAt,
    })),
    billReminders: user.billReminders.map(reminder => ({
      description: reminder.description,
      amount: reminder.amount,
      dueDate: reminder.dueDate,
      isPaid: reminder.isPaid,
      paidAt: reminder.paidAt,
      snoozedUntil: reminder.snoozedUntil,
      lastNotifiedAt: reminder.lastNotifiedAt,
    })),
    recurringTransactions: user.recurringTransactions.map(item => ({
      amount: item.amount,
      kind: item.kind,
      description: item.description,
      interval: item.interval,
      startDate: item.startDate,
      endDate: item.endDate,
      nextDate: item.nextDate,
    })),
    transactionRules: user.transactionRules.map(rule => ({
      keyword: rule.keyword,
      kind: rule.kind,
      categoryId: rule.categoryId,
      financialAccountId: rule.financialAccountId,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
    })),
    accountReconciliations: user.accountReconciliations.map(item => ({
      financialAccountId: item.financialAccountId,
      statementDate: item.statementDate,
      statementBalance: item.statementBalance,
      systemBalance: item.systemBalance,
      transactionCount: item.transactionCount,
      createdAt: item.createdAt,
    })),
    securityEvents: user.securityEvents.map(event => ({
      type: event.type,
      provider: event.provider,
      createdAt: event.createdAt,
    })),
  };

  return exportData;
}

export async function deleteUserAccount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  // Nunca apagar a conta local antes de interromper uma cobrança real.
  await cancelBillingBeforeAccountDeletion(session.user.id);

  await prisma.user.delete({
    where: { id: session.user.id },
  });

  // O redirecionamento e logout precisam ser manipulados pelo client component
  // após o sucesso desta action.
  return { success: true };
}
