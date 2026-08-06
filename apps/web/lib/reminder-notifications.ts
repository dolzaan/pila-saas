import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ClaimedReminderNotification = {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  whatsappNumber: string;
};

const CLAIM_LEASE_MS = 5 * 60 * 1_000;

export async function claimReminderNotifications(input: {
  startOfToday: Date;
  endOfToday: Date;
  claimedAt?: Date;
  limit?: number;
}) {
  const claimedAt = input.claimedAt ?? new Date();
  const staleBefore = new Date(claimedAt.getTime() - CLAIM_LEASE_MS);
  const limit = Math.max(1, Math.min(50, Math.trunc(input.limit ?? 25)));

  const reminders = await prisma.$queryRaw<ClaimedReminderNotification[]>(Prisma.sql`
    WITH candidates AS (
      SELECT reminders."id"
      FROM "bill_reminders" AS reminders
      INNER JOIN "users" AS users ON users."id" = reminders."userId"
      WHERE reminders."isPaid" = FALSE
        AND reminders."dueDate" <= ${input.endOfToday}
        AND (
          reminders."snoozedUntil" IS NULL
          OR reminders."snoozedUntil" <= ${input.endOfToday}
        )
        AND (
          reminders."lastNotifiedAt" IS NULL
          OR reminders."lastNotifiedAt" < ${input.startOfToday}
        )
        AND (
          reminders."notificationClaimedAt" IS NULL
          OR reminders."notificationClaimedAt" < ${staleBefore}
        )
        AND users."whatsappNumber" IS NOT NULL
        AND users."whatsappVerifiedAt" IS NOT NULL
      ORDER BY reminders."dueDate" ASC, reminders."createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE OF reminders SKIP LOCKED
    ), claimed AS (
      UPDATE "bill_reminders" AS reminders
      SET "notificationClaimedAt" = ${claimedAt}
      FROM candidates
      WHERE reminders."id" = candidates."id"
      RETURNING
        reminders."id",
        reminders."userId",
        reminders."description",
        reminders."amount",
        reminders."dueDate"
    )
    SELECT
      claimed."id",
      claimed."description",
      claimed."amount",
      claimed."dueDate",
      users."whatsappNumber"
    FROM claimed
    INNER JOIN "users" AS users ON users."id" = claimed."userId"
    ORDER BY claimed."dueDate" ASC
  `);

  return { claimedAt, reminders };
}

export async function completeReminderNotification(
  id: string,
  claimedAt: Date,
  notifiedAt = new Date(),
) {
  return prisma.$executeRaw(Prisma.sql`
    UPDATE "bill_reminders"
    SET
      "lastNotifiedAt" = ${notifiedAt},
      "notificationCount" = "notificationCount" + 1,
      "snoozedUntil" = NULL,
      "notificationClaimedAt" = NULL
    WHERE "id" = ${id}
      AND "notificationClaimedAt" = ${claimedAt}
  `);
}

export async function releaseReminderNotification(id: string, claimedAt: Date) {
  return prisma.$executeRaw(Prisma.sql`
    UPDATE "bill_reminders"
    SET "notificationClaimedAt" = NULL
    WHERE "id" = ${id}
      AND "notificationClaimedAt" = ${claimedAt}
  `);
}
