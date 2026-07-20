-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "installmentGroupId" TEXT,
ADD COLUMN "installmentNumber" INTEGER,
ADD COLUMN "installmentCount" INTEGER,
ADD COLUMN "originalAmount" DECIMAL(12,2),
ADD COLUMN "purchasedAt" TIMESTAMP(3),
ADD COLUMN "cardStatementDate" TIMESTAMP(3),
ADD COLUMN "cardDueDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "credit_card_payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditCardId" TEXT NOT NULL,
    "sourceAccountId" TEXT,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_card_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_userId_financialAccountId_cardStatementDate_idx"
ON "transactions"("userId", "financialAccountId", "cardStatementDate");

-- CreateIndex
CREATE INDEX "transactions_userId_installmentGroupId_idx"
ON "transactions"("userId", "installmentGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "credit_card_payments_externalMessageId_key"
ON "credit_card_payments"("externalMessageId");

-- CreateIndex
CREATE INDEX "credit_card_payments_userId_creditCardId_statementDate_idx"
ON "credit_card_payments"("userId", "creditCardId", "statementDate");

-- CreateIndex
CREATE INDEX "credit_card_payments_userId_paidAt_idx"
ON "credit_card_payments"("userId", "paidAt");

-- AddForeignKey
ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_creditCardId_fkey"
FOREIGN KEY ("creditCardId") REFERENCES "financial_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_card_payments"
ADD CONSTRAINT "credit_card_payments_sourceAccountId_fkey"
FOREIGN KEY ("sourceAccountId") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
