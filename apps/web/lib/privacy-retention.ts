import { prisma } from "@/lib/prisma";
import { getRawMessageRetentionDays } from "@/lib/privacy";

const PRODUCT_EVENT_RETENTION_DAYS = 180;

export async function runPrivacyRetention(now = new Date()) {
  const retentionDays = getRawMessageRetentionDays();
  const rawMessageCutoff = new Date(
    now.getTime() - retentionDays * 24 * 60 * 60 * 1_000,
  );
  const productEventCutoff = new Date(
    now.getTime() - PRODUCT_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
  );

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

  return {
    rawMessageRetentionDays: retentionDays,
    rawMessagesRemoved: rawMessageResult.count,
    productEventRetentionDays: PRODUCT_EVENT_RETENTION_DAYS,
    productEventsRemoved,
  };
}
