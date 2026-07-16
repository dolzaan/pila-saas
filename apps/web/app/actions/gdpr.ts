"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type UserExportData = Prisma.UserGetPayload<{
  include: {
    transactions: true;
    categories: true;
    budgets: true;
    subscription: true;
  };
}>;

export async function exportUserData() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  const user: UserExportData | null = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      transactions: true,
      categories: true,
      budgets: true,
      subscription: true,
    },
  });

  if (!user) throw new Error("Usuário não encontrado");

  // Format data for export
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
    transactions: user.transactions.map(t => ({
      amount: t.amount,
      kind: t.kind,
      description: t.description,
      occurredAt: t.occurredAt,
      source: t.source,
    })),
  };

  return exportData;
}

export async function deleteUserAccount() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autorizado");

  // As tabelas dependentes (transactions, categories, budgets, etc)
  // serão deletadas automaticamente pelo Prisma devido ao `onDelete: Cascade`.
  await prisma.user.delete({
    where: { id: session.user.id },
  });

  // O redirecionamento e logout precisam ser manipulados pelo client component
  // após o sucesso desta action.
  return { success: true };
}
