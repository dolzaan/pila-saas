import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!process.env.CRON_SECRET) {
      console.error("[Cron Recurring] CRON_SECRET não configurado");
      return NextResponse.json(
        { error: "Cron is not configured" },
        { status: 503 },
      );
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // A recorrência representa o próximo vencimento ainda não confirmado.
    // O cron não cria mais transações automaticamente: o usuário confirma
    // o pagamento pelo painel, e só então nextDate avança.
    const dueRecurring = await prisma.recurringTransaction.findMany({
      where: { nextDate: { lte: new Date() } },
      select: { nextDate: true, endDate: true },
    });
    const pendingConfirmation = dueRecurring.filter(
      (recurring) =>
        !recurring.endDate || recurring.nextDate <= recurring.endDate,
    ).length;

    return NextResponse.json({
      success: true,
      mode: "manual-confirmation",
      pendingConfirmation,
      transactionsCreated: 0,
    });
  } catch (error) {
    console.error("Erro ao verificar transações recorrentes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
