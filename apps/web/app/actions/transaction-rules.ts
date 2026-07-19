"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TransactionRuleSchema } from "@/lib/schemas";
import { matchTransactionRule } from "@/lib/transaction-rules";
import { revalidatePath } from "next/cache";

function revalidateRulePages() {
  revalidatePath("/dashboard/reconciliation");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/accounts");
}

export async function createTransactionRule(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = TransactionRuleSchema.safeParse({
    keyword: formData.get("keyword")?.toString(),
    categoryId: formData.get("categoryId")?.toString(),
    financialAccountId: formData.get("financialAccountId")?.toString() || null,
    applyToExisting: formData.get("applyToExisting") === "on",
  });
  if (!parsed.success) {
    return { error: "Revise os dados da regra.", details: parsed.error.format() };
  }

  const [category, financialAccount, duplicate] = await Promise.all([
    prisma.category.findFirst({
      where: {
        id: parsed.data.categoryId,
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      select: { id: true, kind: true },
    }),
    parsed.data.financialAccountId
      ? prisma.financialAccount.findFirst({
          where: {
            id: parsed.data.financialAccountId,
            userId: session.user.id,
            isArchived: false,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.transactionRule.findFirst({
      where: {
        userId: session.user.id,
        keyword: { equals: parsed.data.keyword, mode: "insensitive" },
      },
      select: { id: true },
    }),
  ]);

  if (!category) return { error: "Categoria inválida ou acesso negado." };
  if (parsed.data.financialAccountId && !financialAccount) {
    return { error: "Conta inválida ou arquivada." };
  }
  if (duplicate) return { error: "Já existe uma regra com essa palavra-chave." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const rule = await transaction.transactionRule.create({
        data: {
          userId: session.user.id,
          keyword: parsed.data.keyword,
          kind: category.kind,
          categoryId: category.id,
          financialAccountId: financialAccount?.id || null,
        },
      });

      let applied = 0;
      if (parsed.data.applyToExisting) {
        const candidates = await transaction.transaction.findMany({
          where: {
            userId: session.user.id,
            kind: category.kind,
            categoryId: null,
            description: { not: null },
          },
          take: 5_000,
          select: { id: true, financialAccountId: true, description: true, kind: true },
        });
        const matchingCandidates = candidates.filter((candidate) =>
          matchTransactionRule([rule], candidate),
        );
        if (matchingCandidates.length > 0) {
          const update = await transaction.transaction.updateMany({
            where: { id: { in: matchingCandidates.map((item) => item.id) } },
            data: {
              categoryId: category.id,
              appliedRuleId: rule.id,
            },
          });
          applied = update.count;
          if (financialAccount) {
            await transaction.transaction.updateMany({
              where: {
                id: { in: matchingCandidates.map((item) => item.id) },
                financialAccountId: null,
              },
              data: { financialAccountId: financialAccount.id },
            });
          }
        }
      }

      return { applied };
    });

    revalidateRulePages();
    return { success: true, applied: result.applied };
  } catch (error) {
    console.error("[createTransactionRule]", error);
    return { error: "Não foi possível criar a regra." };
  }
}

export async function setTransactionRuleActive(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.transactionRule.updateMany({
    where: { id, userId: session.user.id },
    data: { isActive },
  });
  if (result.count === 0) return { error: "Regra não encontrada." };
  revalidateRulePages();
  return { success: true };
}

export async function deleteTransactionRule(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.transactionRule.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return { error: "Regra não encontrada." };
  revalidateRulePages();
  return { success: true };
}
