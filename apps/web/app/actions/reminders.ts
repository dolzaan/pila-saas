"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReminderDate, reminderDateKey, saoPauloDateKey } from "@/lib/reminders";
import { BillReminderSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

function parseAmount(value: FormDataEntryValue | null) {
  const input = value?.toString().trim();
  if (!input) return Number.NaN;
  return Number(input.replace(",", "."));
}

function revalidateReminderPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reminders");
}

function reminderPayload(formData: FormData) {
  return BillReminderSchema.safeParse({
    description: formData.get("description")?.toString(),
    amount: parseAmount(formData.get("amount")),
    dueDate: formData.get("dueDate")?.toString(),
  });
}

export async function createBillReminder(_state: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = reminderPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados do lembrete.", details: parsed.error.format() };
  }

  const dueDate = parseReminderDate(parsed.data.dueDate);
  if (!dueDate) return { error: "Informe uma data de vencimento válida." };

  try {
    await prisma.billReminder.create({
      data: {
        userId: session.user.id,
        description: parsed.data.description,
        amount: parsed.data.amount,
        dueDate,
      },
    });
    revalidateReminderPages();
    return { success: true };
  } catch (error) {
    console.error("[createBillReminder]", error);
    return { error: "Não foi possível criar o lembrete." };
  }
}

export async function updateBillReminder(
  id: string,
  _state: unknown,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const parsed = reminderPayload(formData);
  if (!parsed.success) {
    return { error: "Revise os dados do lembrete.", details: parsed.error.format() };
  }

  const dueDate = parseReminderDate(parsed.data.dueDate);
  if (!dueDate) return { error: "Informe uma data de vencimento válida." };

  try {
    const result = await prisma.billReminder.updateMany({
      where: { id, userId: session.user.id },
      data: {
        description: parsed.data.description,
        amount: parsed.data.amount,
        dueDate,
        snoozedUntil: null,
        lastNotifiedAt: null,
      },
    });
    if (result.count === 0) return { error: "Lembrete não encontrado." };

    revalidateReminderPages();
    return { success: true };
  } catch (error) {
    console.error("[updateBillReminder]", error);
    return { error: "Não foi possível atualizar o lembrete." };
  }
}

export async function setBillReminderPaid(id: string, isPaid: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.billReminder.updateMany({
    where: { id, userId: session.user.id },
    data: isPaid
      ? { isPaid: true, paidAt: new Date(), snoozedUntil: null }
      : {
          isPaid: false,
          paidAt: null,
          snoozedUntil: null,
          lastNotifiedAt: null,
        },
  });
  if (result.count === 0) return { error: "Lembrete não encontrado." };

  revalidateReminderPages();
  return { success: true };
}

export async function snoozeBillReminder(id: string, until: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const snoozedUntil = parseReminderDate(until);
  if (!snoozedUntil || reminderDateKey(snoozedUntil) <= saoPauloDateKey()) {
    return { error: "Escolha uma data futura para adiar." };
  }

  const result = await prisma.billReminder.updateMany({
    where: { id, userId: session.user.id, isPaid: false },
    data: { snoozedUntil, lastNotifiedAt: null },
  });
  if (result.count === 0) return { error: "Lembrete pendente não encontrado." };

  revalidateReminderPages();
  return { success: true };
}

export async function deleteBillReminder(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  const result = await prisma.billReminder.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return { error: "Lembrete não encontrado." };

  revalidateReminderPages();
  return { success: true };
}
