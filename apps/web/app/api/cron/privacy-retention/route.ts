import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRawMessageRetentionDays } from "@/lib/privacy";

export const dynamic = "force-dynamic";

const PRODUCT_EVENT_RETENTION_DAYS = 180;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    console.error("[Cron Privacy Retention] CRON_SECRET não configurado");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retentionDays = getRawMessageRetentionDays();
  const rawMessageCutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1_000,
  );
  const productEventCutoff = new Date(
    Date.now() - PRODUCT_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );

  try {
    const [rawMessageResult, productEventsRemoved] = await Promise.all([
      prisma.transaction.updateMany({
        where: {
          rawMessage: { not: null },
          createdAt: { lt: rawMessageCutoff },
        },
        data: { rawMessage: null },
      }),
      prisma.$executeRaw`
        DELETE FROM "product_events"
        WHERE "createdAt" < ${productEventCutoff}
      `,
    ]);

    return NextResponse.json(
      {
        success: true,
        rawMessageRetentionDays: retentionDays,
        rawMessagesRemoved: rawMessageResult.count,
        productEventRetentionDays: PRODUCT_EVENT_RETENTION_DAYS,
        productEventsRemoved,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Cron Privacy Retention] Falha:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
