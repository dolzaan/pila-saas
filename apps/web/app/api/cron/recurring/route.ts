import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";
import type { RecurringTransaction, RecurrenceInterval } from "@prisma/client";

export const dynamic = "force-dynamic";

function getNextDate(date: Date, interval: RecurrenceInterval): Date {
  switch (interval) {
    case "DAILY": return addDays(date, 1);
    case "WEEKLY": return addWeeks(date, 1);
    case "MONTHLY": return addMonths(date, 1);
    case "YEARLY": return addYears(date, 1);
    default: return addMonths(date, 1);
  }
}

export async function GET(request: Request) {
  try {
    // Validação de segurança básica para crons
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Buscar todas as contas recorrentes que precisam ser processadas
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: {
        nextDate: { lte: now },
      },
    });

    let createdCount = 0;

    for (const rt of dueRecurring) {
      // Se tiver data final e já passou, não gerar mais
      if (rt.endDate && rt.nextDate > rt.endDate) {
        continue;
      }

      let currentDateToProcess = rt.nextDate;
      const transactionsToCreate = [];

      // Gerar transações para todos os períodos que passaram
      while (currentDateToProcess <= now) {
        if (rt.endDate && currentDateToProcess > rt.endDate) {
          break;
        }

        transactionsToCreate.push({
          userId: rt.userId,
          categoryId: rt.categoryId,
          amount: rt.amount,
          kind: rt.kind,
          description: rt.description || "Transação Recorrente",
          occurredAt: currentDateToProcess,
          source: "cron",
          recurringTransactionId: rt.id,
        });

        currentDateToProcess = getNextDate(currentDateToProcess, rt.interval);
      }

      if (transactionsToCreate.length > 0) {
        // Criar as transações
        await prisma.transaction.createMany({
          data: transactionsToCreate,
        });
        createdCount += transactionsToCreate.length;

        // Atualizar a próxima data na recurring transaction
        await prisma.recurringTransaction.update({
          where: { id: rt.id },
          data: { nextDate: currentDateToProcess },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: dueRecurring.length,
      transactionsCreated: createdCount,
    });
  } catch (error) {
    console.error("Erro ao processar transações recorrentes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
