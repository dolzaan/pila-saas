ALTER TABLE "subscriptions"
  ADD COLUMN "lastPaymentEventAt" TIMESTAMP(3),
  ADD COLUMN "lastPaymentEventId" TEXT;

ALTER TABLE "payment_subscriptions"
  ADD COLUMN "lastEventAt" TIMESTAMP(3);

ALTER TABLE "payment_webhook_events"
  ADD COLUMN "occurredAt" TIMESTAMP(3);

ALTER TABLE "bill_reminders"
  ADD COLUMN "notificationClaimedAt" TIMESTAMP(3);

CREATE INDEX "bill_reminders_isPaid_notificationClaimedAt_dueDate_idx"
  ON "bill_reminders"("isPaid", "notificationClaimedAt", "dueDate");
