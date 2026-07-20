CREATE TABLE "account_transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceAccountId" TEXT NOT NULL,
    "destinationAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_transfers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "account_transfers_distinct_accounts_check"
      CHECK ("sourceAccountId" <> "destinationAccountId"),
    CONSTRAINT "account_transfers_positive_amount_check"
      CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "account_transfers_externalMessageId_key"
  ON "account_transfers"("externalMessageId");
CREATE INDEX "account_transfers_userId_occurredAt_idx"
  ON "account_transfers"("userId", "occurredAt");
CREATE INDEX "account_transfers_sourceAccountId_occurredAt_idx"
  ON "account_transfers"("sourceAccountId", "occurredAt");
CREATE INDEX "account_transfers_destinationAccountId_occurredAt_idx"
  ON "account_transfers"("destinationAccountId", "occurredAt");

ALTER TABLE "account_transfers"
  ADD CONSTRAINT "account_transfers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_transfers"
  ADD CONSTRAINT "account_transfers_sourceAccountId_fkey"
  FOREIGN KEY ("sourceAccountId") REFERENCES "financial_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_transfers"
  ADD CONSTRAINT "account_transfers_destinationAccountId_fkey"
  FOREIGN KEY ("destinationAccountId") REFERENCES "financial_accounts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
