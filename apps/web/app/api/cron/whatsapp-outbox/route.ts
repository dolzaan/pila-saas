import { NextResponse } from "next/server";
import { sendWhatsAppMessageDirect } from "@/lib/evolution";
import { logger } from "@/lib/logger";
import {
  claimWhatsappOutboxMessages,
  decryptWhatsappOutboxMessage,
  markWhatsappOutboxFailed,
  markWhatsappOutboxSent,
  releaseStaleWhatsappOutboxMessages,
} from "@/lib/whatsapp-outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await releaseStaleWhatsappOutboxMessages();
    const rows = await claimWhatsappOutboxMessages(25);
    let sent = 0;
    let failed = 0;
    let dead = 0;

    for (const row of rows) {
      try {
        const message = decryptWhatsappOutboxMessage(row);
        const result = await sendWhatsAppMessageDirect(message.phone, message.text);

        if (result.success) {
          await markWhatsappOutboxSent(message.id);
          sent += 1;
        } else {
          await markWhatsappOutboxFailed({
            id: message.id,
            previousAttempts: message.attempts,
            error: result.error || "Falha no reenvio",
          });
          failed += 1;
          if (message.attempts + 1 >= 5) dead += 1;
        }
      } catch (error) {
        await markWhatsappOutboxFailed({
          id: row.id,
          previousAttempts: row.attempts,
          error: error instanceof Error ? error.message : "Falha ao ler mensagem",
        });
        failed += 1;
        if (row.attempts + 1 >= 5) dead += 1;
      }
    }

    logger.info("whatsapp_outbox_processed", {
      claimed: rows.length,
      sent,
      failed,
      dead,
      staleReleased: released,
    });

    return NextResponse.json(
      {
        success: true,
        claimed: rows.length,
        sent,
        failed,
        dead,
        staleReleased: released,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("whatsapp_outbox_processing_failed", { error });
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
