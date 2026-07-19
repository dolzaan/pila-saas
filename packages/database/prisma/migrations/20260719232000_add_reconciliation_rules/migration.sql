-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "reconciliationId" TEXT,
ADD COLUMN "appliedRuleId" TEXT;

-- CreateTable
CREATE TABLE "transaction_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "financialAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_reconciliations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "financialAccountId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3) NOT NULL,
    "statementBalance" DECIMAL(12,2) NOT NULL,
    "systemBalance" DECIMAL(12,2) NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_userId_reconciliationId_idx"
ON "transactions"("userId", "reconciliationId");

-- CreateIndex
CREATE INDEX "transactions_userId_appliedRuleId_idx"
ON "transactions"("userId", "appliedRuleId");

-- CreateIndex
CREATE INDEX "transaction_rules_userId_isActive_idx"
ON "transaction_rules"("userId", "isActive");

-- CreateIndex
CREATE INDEX "transaction_rules_userId_kind_idx"
ON "transaction_rules"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "account_reconciliations_financialAccountId_statementDate_key"
ON "account_reconciliations"("financialAccountId", "statementDate");

-- CreateIndex
CREATE INDEX "account_reconciliations_userId_createdAt_idx"
ON "account_reconciliations"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "transaction_rules"
ADD CONSTRAINT "transaction_rules_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_rules"
ADD CONSTRAINT "transaction_rules_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_rules"
ADD CONSTRAINT "transaction_rules_financialAccountId_fkey"
FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliations"
ADD CONSTRAINT "account_reconciliations_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reconciliations"
ADD CONSTRAINT "account_reconciliations_financialAccountId_fkey"
FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_reconciliationId_fkey"
FOREIGN KEY ("reconciliationId") REFERENCES "account_reconciliations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_appliedRuleId_fkey"
FOREIGN KEY ("appliedRuleId") REFERENCES "transaction_rules"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
