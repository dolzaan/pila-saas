import { NextResponse } from "next/server";
import { sendWhatsAppMessageDirect } from "@/lib/evolution";
import { saoPauloDayBounds } from "@/lib/reminders";
import {
  claimReminderNotifications,
  completeReminderNotification,
  releaseReminderNotification,
} from "@/lib/reminder-notifications";
import { enqueueWhatsappTextMessage } from "@/lib/whatsapp-outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const { start: startOfToday, end: endOfToday } = saoPauloDayBounds();
    const { claimedAt, reminders } = await claimReminderNotifications({
      startOfToday,
      endOfToday,
      limit: 25,
    });

    let sentCount = 0;
    let queuedCount = 0;
    let failedCount = 0;

    for (const reminder of reminders) {
      try {
        const amountStr = Number(reminder.amount).toFixed(2);
        const dateStr = reminder.dueDate.toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        });
        const message = `⏰ *Lembrete de Conta!* ⏰\n\nChefe, passando pra lembrar que a conta "${reminder.description}" no valor de R$ ${amountStr} está com vencimento para ${dateStr}.\n\nSe já pagou, me avisa pra eu registrar!`;

        const result = await sendWhatsAppMessageDirect(
          `${reminder.whatsappNumber}@s.whatsapp.net`,
          message,
        );

        if (result.success) {
          sentCount++;
        } else {
          await enqueueWhatsappTextMessage({
            phone: reminder.whatsappNumber,
            text: message,
            error: result.error,
          });
          queuedCount++;
        }

        await completeReminderNotification(reminder.id, claimedAt);
      } catch (error) {
        failedCount++;
        console.error("[Cron Reminders] Falha no lembrete:", reminder.id, error);
        await releaseReminderNotification(reminder.id, claimedAt);
      }
    }

    return NextResponse.json({
      success: true,
      claimed: reminders.length,
      sent: sentCount,
      queued: queuedCount,
      failed: failedCount,
    });

  } catch (error) {
    console.error("[Cron Reminders] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
