"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordProductEvent } from "@/lib/product-events";
import { TransactionSchema } from "@/lib/schemas";
import { matchTransactionRule } from "@/lib/transaction-rules";
import { revalidatePath } from "next/cache";

function parseOccurredAt(value: FormDataEntryValue | null) {
  const input = value?.toString();
  if (!input) return undefined;
  const date = new Date(`${input}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? input : date.toISOString();
}

async function validateRelations(input: {
  userId: string;
  kind: "EXPENSE" | "INCOME";
  categoryId?: string | null;
  financialAccountId?: string | null;
}) {
  const [category, financialAccount] = await Promise.all([
    input.categoryId
      ? prisma.category.findFirst({
          where: {
            id: input.categoryId,
            kind: input.kind,
            OR: [{ userId: input.userId }, { userId: null }],
          },
          select: { id: true },
        })
      : Promise.resolve({ id: "" }),
    input.financialAccountId
      ? prisma.financialAccount.findFirst({
          where: { id: input.financialAccountId, userId: input.userId },
          select: { id: true },
        })
      : Promise.resolve({ id: "" }),
  ]);

  if (!category) return "Categoria inválida ou acesso negado.";
  if (!financialAccount) return "Conta inválida ou acesso negado.";
  return null;
}

export async function createTransaction(_prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const amountStr = formData.get("amount")?.toString();
  const kind = formData.get("kind")?.toString();
  const description = formData.get("description")?.toString();
  const categoryId = formData.get("categoryId")?.toString() || null;
  const financialAccountId = formData.get("financialAccountId")?.toString() || null;

  const amount = amountStr ? parseFloat(amountStr.replace(",", ".")) : 0;

  const parsed = TransactionSchema.safeParse({
    amount,
    kind,
    description,
    categoryId,
    financialAccountId,
    occurredAt: parseOccurredAt(formData.get("occurredAt")),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos.", details: parsed.error.format() };
  }

  try {
    const relationError = await validateRelations({
      userId: session.user.id,
      kind: parsed.data.kind,
      categoryId: parsed.data.categoryId,
      financialAccountId: parsed.data.financialAccountId,
    });
    if (relationError) return { error: relationError };

    const [rules, previousTransactionCount] = await Promise.all([
      !parsed.data.categoryId || !parsed.data.financialAccountId
        ? prisma.transactionRule.findMany({
            where: { userId: session.user.id, isActive: true, kind: parsed.data.kind },
          })
        : Promise.resolve([]),
      prisma.transaction.count({ where: { userId: session.user.id } }),
    ]);
    const rule = matchTransactionRule(rules, {
      description: parsed.data.description,
      kind: parsed.data.kind,
    });
    const ruleWasApplied = Boolean(
      rule &&
        ((!parsed.data.categoryId && rule.categoryId) ||
          (!parsed.data.financialAccountId && rule.financialAccountId)),
    );

    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: parsed.data.amount,
        kind: parsed.data.kind,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId || rule?.categoryId || null,
        financialAccountId:
          parsed.data.financialAccountId || rule?.financialAccountId || null,
        appliedRuleId: ruleWasApplied ? rule?.id : null,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
        source: "manual",
      },
    });

    await recordProductEvent({
      eventName: "transaction_created",
      userId: session.user.id,
      properties: { source: "manual", kind: parsed.data.kind },
    });
    if (previousTransactionCount === 0) {
      await recordProductEvent({
        eventName: "first_transaction_created",
        userId: session.user.id,
        properties: { source: "manual", kind: parsed.data.kind },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[createTransaction]", error);
    return { error: "Erro interno ao criar transação." };
  }
}

export async function updateTransaction(id: string, _prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const amountStr = formData.get("amount")?.toString();
  const kind = formData.get("kind")?.toString();
  const description = formData.get("description")?.toString();
  const categoryId = formData.get("categoryId")?.toString() || null;
  const financialAccountId = formData.get("financialAccountId")?.toString() || null;

  const amount = amountStr ? parseFloat(amountStr.replace(",", ".")) : 0;

  const parsed = TransactionSchema.safeParse({
    amount,
    kind,
    description,
    categoryId,
    financialAccountId,
    occurredAt: parseOccurredAt(formData.get("occurredAt")),
  });

  if (!parsed.success) {
    return { error: "Dados inválidos.", details: parsed.error.format() };
  }

  try {
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== session.user.id) {
      return { error: "Transação não encontrada ou acesso negado." };
    }
    if (transaction.reconciliationId) {
      return {
        error: "Esta transação já foi conciliada. Desfaça a conciliação antes de editar.",
      };
    }

    const relationError = await validateRelations({
      userId: session.user.id,
      kind: parsed.data.kind,
      categoryId: parsed.data.categoryId,
      financialAccountId: parsed.data.financialAccountId,
    });
    if (relationError) return { error: relationError };

    await prisma.transaction.update({
      where: { id },
      data: {
        amount: parsed.data.amount,
        kind: parsed.data.kind,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        financialAccountId: parsed.data.financialAccountId,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[updateTransaction]", error);
    return { error: "Erro interno ao atualizar transação." };
  }
}

export async function deleteTransaction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  try {
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction || transaction.userId !== session.user.id) {
      return { error: "Transação não encontrada ou acesso negado." };
    }
    if (transaction.reconciliationId) {
      return {
        error: "Esta transação já foi conciliada. Desfaça a conciliação antes de excluir.",
      };
    }

    await prisma.transaction.delete({ where: { id } });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");
    return { success: true };
  } catch (error) {
    console.error("[deleteTransaction]", error);
    return { error: "Erro interno ao excluir transação." };
  }
}
