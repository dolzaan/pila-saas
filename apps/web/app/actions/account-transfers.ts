"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { getAccountLedgerSummaries } from "@/lib/account-ledger";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AccountTransferSchema = z.object({
  sourceAccountId: z.string().trim().min(1).max(191),
  destinationAccountId: z.string().trim().min(1).max(191),
  amount: z.number().finite().positive().max(1_000_000_000),
  description: z.string().trim().max(255).optional(),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).superRefine((value, context) => {
  if (value.sourceAccountId === value.destinationAccountId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["destinationAccountId"],
      message: "Escolha contas diferentes.",
    });
  }
});

function parseAmount(value: FormDataEntryValue | null) {
  const input = value?.toString().trim() || "";
  const parsed = Number(input.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function revalidateFinancialPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/reports");
}

export async function createAccountTransfer(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Não autorizado." };

  const parsed = AccountTransferSchema.safeParse({
    sourceAccountId: formData.get("sourceAccountId")?.toString(),
    destinationAccountId: formData.get("destinationAccountId")?.toString(),
    amount: parseAmount(formData.get("amount")),
    description: formData.get("description")?.toString() || undefined,
    occurredAt: formData.get("occurredAt")?.toString(),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Revise os dados da transferência.",
      details: parsed.error.format(),
    };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw(Prisma.sql`
        SELECT pg_advisory_xact_lock(hashtext(${`account-transfer:${parsed.data.sourceAccountId}`}))
      `);

      const accountIds = [
        parsed.data.sourceAccountId,
        parsed.data.destinationAccountId,
      ];
      const accounts = await transaction.financialAccount.findMany({
        where: {
          id: { in: accountIds },
          userId: session.user.id,
          isArchived: false,
        },
        select: { id: true, type: true },
      });

      if (accounts.length !== 2) {
        return {
          success: false,
          error: "Uma das contas não existe ou está arquivada.",
        } as const;
      }
      if (accounts.some(
        (account) => account.type === "CREDIT_CARD" || account.type === "BENEFIT_CARD",
      )) {
        return {
          success: false,
          error: "Cartões não participam de transferências. Use pagamento de fatura ou recarga de benefício.",
        } as const;
      }

      const summaries = await getAccountLedgerSummaries(session.user.id, {
        client: transaction,
      });
      const sourceSummary = summaries.get(parsed.data.sourceAccountId);
      if (!sourceSummary) {
        return { success: false, error: "Conta de origem não encontrada." } as const;
      }

      if (sourceSummary.balance < parsed.data.amount) {
        return {
          success: false,
          error: `Saldo insuficiente. Disponível: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(sourceSummary.balance)}.`,
        } as const;
      }

      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "account_transfers" (
          "id",
          "userId",
          "sourceAccountId",
          "destinationAccountId",
          "amount",
          "description",
          "occurredAt",
          "source",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${session.user.id},
          ${parsed.data.sourceAccountId},
          ${parsed.data.destinationAccountId},
          ${parsed.data.amount},
          ${parsed.data.description || null},
          ${parseDate(parsed.data.occurredAt)},
          'manual',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `);

      return { success: true } as const;
    }, {
      maxWait: 5_000,
      timeout: 10_000,
    });

    if ("error" in result) return result;

    revalidateFinancialPages();
    return result;
  } catch (error) {
    console.error("[createAccountTransfer]", error);
    return { success: false, error: "Não foi possível concluir a transferência." };
  }
}
