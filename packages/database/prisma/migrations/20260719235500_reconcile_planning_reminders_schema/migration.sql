-- Reconcile schema drift in databases that were baselined after the original
-- migration had already evolved. These statements are intentionally
-- idempotent so environments that already contain part of the schema remain
-- safe to deploy.

-- Authentication and verification fields reported as missing in production.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "verification_tokens"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- Reminder fields used by /dashboard/reminders and /dashboard/planning.
ALTER TABLE "bill_reminders"
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastNotifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "bill_reminders_userId_dueDate_idx"
  ON "bill_reminders"("userId", "dueDate");

-- Financial goals were introduced together with the planning page. Create the
-- table when the database was baselined before that feature existed.
CREATE TABLE IF NOT EXISTS "financial_goals" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT '🎯',
  "targetAmount" DECIMAL(12,2) NOT NULL,
  "savedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "targetDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "financial_goals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "financial_goals_userId_completedAt_idx"
  ON "financial_goals"("userId", "completedAt");

CREATE INDEX IF NOT EXISTS "financial_goals_userId_targetDate_idx"
  ON "financial_goals"("userId", "targetDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'financial_goals_userId_fkey'
      AND conrelid = 'financial_goals'::regclass
  ) THEN
    ALTER TABLE "financial_goals"
      ADD CONSTRAINT "financial_goals_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
