CREATE TABLE "payment_customers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_subscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSubscriptionId" TEXT NOT NULL,
  "billingType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'INACTIVE',
  "nextDueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_customers_userId_provider_key"
  ON "payment_customers"("userId", "provider");
CREATE UNIQUE INDEX "payment_customers_provider_providerCustomerId_key"
  ON "payment_customers"("provider", "providerCustomerId");
CREATE UNIQUE INDEX "payment_subscriptions_userId_provider_key"
  ON "payment_subscriptions"("userId", "provider");
CREATE UNIQUE INDEX "payment_subscriptions_provider_providerSubscriptionId_key"
  ON "payment_subscriptions"("provider", "providerSubscriptionId");
CREATE INDEX "payment_webhook_events_provider_receivedAt_idx"
  ON "payment_webhook_events"("provider", "receivedAt");

ALTER TABLE "payment_customers"
  ADD CONSTRAINT "payment_customers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_subscriptions"
  ADD CONSTRAINT "payment_subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
