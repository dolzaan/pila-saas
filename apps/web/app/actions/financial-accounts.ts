"use server";

import { auth } from "@/lib/auth";
import {
  FinancialImportError,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  parseFinancialImport,
} from "@/lib/financial-import";
import { prisma } from "@/lib/prisma";
import { FinancialAccountSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const importPayloadSchema = z.object({
  accountId: z.string().trim().min(1).max(191),
  fileName: z.string().trim().min(1).max(255),
  content: z.string().min(1).max(MAX_IMPORT_FILE_BYTES),
});

const confirmImportSchema = importPayloadSchema.extend({
  selectedFingerprints: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(MAX_IMPORT_ROWS),
});

function optionalNumber(value: FormDataEntryValue | null) {
  const input = value?.toString().trim();
  if (!input) return undefined;
  const parsed = Number(input.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function ownedFinancialAccount(userId: string, accountId: string) {
  return prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true, isArchived: true },
  });
}

function revalidateFinancialPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/transactions");
}

export async function createFinancialAccount(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const type = formData.get("type")?.toString();
  const parsed = FinancialAccountSchema.safeParse({
    name: formData.get("name")?.toString(),
    type,
    initialBalance: optionalNumber(formData.get("initialBalance")) ?? 0,
    creditLimit: type === "CREDIT_CARD" ? optionalNumber(formData.get("creditLimit")) : undefined,
    closingDay: type === "CREDIT_CARD" ? optionalNumber(formData.get("closingDay")) : undefined,
    dueDay: type === "CREDIT_CARD" ? optionalNumber(formData.get("dueDay")) : undefined,
  });

  if (!parsed.success) {
    return { error: "Revise os dados da conta.", details: parsed.error.format() };
  }

  const existing = await prisma.financialAccount.findFirst({
    where: {
      userId: session.user.id,
      name: { equals: parsed.data.name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return { error: "Você já possui uma conta com esse nome." };

  try {
    await prisma.financialAccount.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        type: parsed.data.type,
        initialBalance: parsed.data.type === "CREDIT_CARD" ? 0 : parsed.data.initialBalance,
        creditLimit: parsed.data.creditLimit,
        closingDay: parsed.data.closingDay,
        dueDay: parsed.data.dueDay,
      },
    });
    revalidateFinancialPages();
    return { success: true };
  } catch (error) {
    console.error("[createFinancialAccount]", error);
    return { error: "Não foi possível criar a conta." };
  }
}

export async function setFinancialAccountArchived(id: string, isArchived: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.financialAccount.updateMany({
    where: { id, userId: session.user.id },
    data: { isArchived },
  });
  if (result.count === 0) return { error: "Conta não encontrada." };

  revalidateFinancialPages();
  return { success: true };
}

export async function previewFinancialImport(input: {
  accountId: string;
  fileName: string;
  content: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const payload = importPayloadSchema.safeParse(input);
  if (!payload.success) return { error: "Arquivo ou conta inválidos." };

  const account = await ownedFinancialAccount(session.user.id, payload.data.accountId);
  if (!account || account.isArchived) {
    return { error: "Selecione uma conta ativa da sua lista." };
  }

  try {
    const parsed = parseFinancialImport(payload.data);
    const existing = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        importFingerprint: { in: parsed.rows.map((row) => row.fingerprint) },
      },
      select: { importFingerprint: true },
    });
    const duplicateFingerprints = new Set(
      existing.flatMap((transaction) =>
        transaction.importFingerprint ? [transaction.importFingerprint] : [],
      ),
    );
    const seenInFile = new Set<string>();

    return {
      success: true,
      format: parsed.format,
      ignoredRows: parsed.ignoredRows,
      rows: parsed.rows.map((row) => {
        const duplicate = duplicateFingerprints.has(row.fingerprint) || seenInFile.has(row.fingerprint);
        seenInFile.add(row.fingerprint);
        return { ...row, duplicate };
      }),
    };
  } catch (error) {
    if (error instanceof FinancialImportError) return { error: error.message };
    console.error("[previewFinancialImport]", error);
    return { error: "Não foi possível ler o arquivo." };
  }
}

export async function confirmFinancialImport(input: {
  accountId: string;
  fileName: string;
  content: string;
  selectedFingerprints: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const payload = confirmImportSchema.safeParse(input);
  if (!payload.success) return { error: "Seleção de importação inválida." };

  const account = await ownedFinancialAccount(session.user.id, payload.data.accountId);
  if (!account || account.isArchived) {
    return { error: "A conta não está mais disponível para importação." };
  }

  try {
    const parsed = parseFinancialImport(payload.data);
    const selected = new Set(payload.data.selectedFingerprints);
    const requestedRows = parsed.rows.filter((row) => selected.has(row.fingerprint));
    if (requestedRows.length === 0) return { error: "Nenhuma transação foi selecionada." };

    const existing = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        importFingerprint: { in: requestedRows.map((row) => row.fingerprint) },
      },
      select: { importFingerprint: true },
    });
    const duplicates = new Set(
      existing.flatMap((transaction) =>
        transaction.importFingerprint ? [transaction.importFingerprint] : [],
      ),
    );
    const rowsToCreate = requestedRows.filter((row) => !duplicates.has(row.fingerprint));

    const result = rowsToCreate.length
      ? await prisma.transaction.createMany({
          data: rowsToCreate.map((row) => ({
            userId: session.user.id,
            financialAccountId: payload.data.accountId,
            amount: row.amount,
            kind: row.kind,
            description: row.description,
            occurredAt: new Date(row.occurredAt),
            source: "import",
            importFingerprint: row.fingerprint,
          })),
          skipDuplicates: true,
        })
      : { count: 0 };

    revalidateFinancialPages();
    return {
      success: true,
      imported: result.count,
      skipped: requestedRows.length - result.count,
    };
  } catch (error) {
    if (error instanceof FinancialImportError) return { error: error.message };
    console.error("[confirmFinancialImport]", error);
    return { error: "Não foi possível concluir a importação." };
  }
}
