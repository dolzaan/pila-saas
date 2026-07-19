"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReminderDate } from "@/lib/reminders";
import {
  FinancialGoalContributionSchema,
  FinancialGoalSchema,
} from "@/lib/schemas";
import { revalidatePath } from "next/cache";

function parseAmount(value: FormDataEntryValue | null) {
  const input = value?.toString().trim();
  if (!input) return Number.NaN;
  return Number(input.replace(",", "."));
}

function revalidatePlanning() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/planning");
}

function goalPayload(formData: FormData) {
  return FinancialGoalSchema.safeParse({
    name: formData.get("name")?.toString(),
    icon: formData.get("icon")?.toString() || "🎯",
    targetAmount: parseAmount(formData.get("targetAmount")),
    savedAmount: parseAmount(formData.get("savedAmount") || "0"),
    targetDate: formData.get("targetDate")?.toString() || "",
  });
}

export async function createFinancialGoal(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = goalPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados da meta.", details: parsed.error.format() };
  }

  const targetDate = parsed.data.targetDate
    ? parseReminderDate(parsed.data.targetDate)
    : null;
  if (parsed.data.targetDate && !targetDate) return { error: "Informe uma data válida." };

  try {
    await prisma.financialGoal.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        icon: parsed.data.icon,
        targetAmount: parsed.data.targetAmount,
        savedAmount: parsed.data.savedAmount,
        targetDate,
        completedAt:
          parsed.data.savedAmount >= parsed.data.targetAmount ? new Date() : null,
      },
    });
    revalidatePlanning();
    return { success: true };
  } catch (error) {
    console.error("[createFinancialGoal]", error);
    return { error: "Não foi possível criar a meta." };
  }
}

export async function updateFinancialGoal(
  id: string,
  _state: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = goalPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados da meta.", details: parsed.error.format() };
  }

  const targetDate = parsed.data.targetDate
    ? parseReminderDate(parsed.data.targetDate)
    : null;
  if (parsed.data.targetDate && !targetDate) return { error: "Informe uma data válida." };

  try {
    const result = await prisma.financialGoal.updateMany({
      where: { id, userId: session.user.id },
      data: {
        name: parsed.data.name,
        icon: parsed.data.icon,
        targetAmount: parsed.data.targetAmount,
        savedAmount: parsed.data.savedAmount,
        targetDate,
        completedAt:
          parsed.data.savedAmount >= parsed.data.targetAmount ? new Date() : null,
      },
    });
    if (result.count === 0) return { error: "Meta não encontrada." };
    revalidatePlanning();
    return { success: true };
  } catch (error) {
    console.error("[updateFinancialGoal]", error);
    return { error: "Não foi possível atualizar a meta." };
  }
}

export async function changeFinancialGoalAmount(
  id: string,
  _state: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = FinancialGoalContributionSchema.safeParse({
    amount: parseAmount(formData.get("amount")),
    operation: formData.get("operation")?.toString(),
  });
  if (!parsed.success) return { error: "Informe um valor válido." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const goal = await transaction.financialGoal.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!goal) return null;

      const current = goal.savedAmount.toNumber();
      const next =
        parsed.data.operation === "DEPOSIT"
          ? current + parsed.data.amount
          : current - parsed.data.amount;
      if (next < 0) return { error: "A retirada supera o valor guardado." };
      if (next > goal.targetAmount.toNumber()) {
        return { error: "O aporte supera o valor que falta para concluir a meta." };
      }

      await transaction.financialGoal.update({
        where: { id: goal.id },
        data: {
          savedAmount: next,
          completedAt: next >= goal.targetAmount.toNumber() ? new Date() : null,
        },
      });
      return { success: true };
    });

    if (!result) return { error: "Meta não encontrada." };
    if ("error" in result) return result;
    revalidatePlanning();
    return result;
  } catch (error) {
    console.error("[changeFinancialGoalAmount]", error);
    return { error: "Não foi possível atualizar o valor guardado." };
  }
}

export async function deleteFinancialGoal(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.financialGoal.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return { error: "Meta não encontrada." };

  revalidatePlanning();
  return { success: true };
}
