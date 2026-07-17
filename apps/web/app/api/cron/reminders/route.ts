import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/evolution";

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[Cron Reminders] CRON_SECRET não configurado");
    return new NextResponse("Cron is not configured", { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Busca todos os lembretes que não foram pagos e que vencem hoje (ou venceram)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const pendingReminders = await prisma.billReminder.findMany({
      where: {
        isPaid: false,
        dueDate: { lte: today },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: today } }],
        AND: [{ OR: [{ lastNotifiedAt: null }, { lastNotifiedAt: { lt: startOfToday } }] }],
      },
      include: { user: true }
    });

    let sentCount = 0;

    for (const reminder of pendingReminders) {
      if (reminder.user.whatsappNumber) {
        const amountStr = Number(reminder.amount).toFixed(2);
        const dateStr = reminder.dueDate.toLocaleDateString("pt-BR");
        
        const message = `⏰ *Lembrete de Conta!* ⏰\n\nChefe, passando pra lembrar que a conta "${reminder.description}" no valor de R$ ${amountStr} está com vencimento para ${dateStr}.\n\nSe já pagou, me avisa pra eu registrar!`;
        
        const success = await sendWhatsAppMessage(`${reminder.user.whatsappNumber}@s.whatsapp.net`, message);
        
        if (success) {
          sentCount++;
          await prisma.billReminder.update({
            where: { id: reminder.id },
            data: {
              lastNotifiedAt: new Date(),
              notificationCount: { increment: 1 },
              snoozedUntil: null,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, sent: sentCount });

  } catch (error) {
    console.error("[Cron Reminders] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
