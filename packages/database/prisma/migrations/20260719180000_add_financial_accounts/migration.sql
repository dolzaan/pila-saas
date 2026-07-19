-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM (
    'CHECKING',
    'SAVINGS',
    'CASH',
    'CREDIT_CARD',
    'INVESTMENT',
    'OTHER'
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL,
    "initialBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(12,2),
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions"
ADD COLUMN "financialAccountId" TEXT,
ADD COLUMN "importFingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "financial_accounts_userId_name_key"
ON "financial_accounts"("userId", "name");

-- CreateIndex
CREATE INDEX "financial_accounts_userId_isArchived_idx"
ON "financial_accounts"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "transactions_userId_financialAccountId_idx"
ON "transactions"("userId", "financialAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_userId_importFingerprint_key"
ON "transactions"("userId", "importFingerprint");

-- AddForeignKey
ALTER TABLE "financial_accounts"
ADD CONSTRAINT "financial_accounts_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_financialAccountId_fkey"
FOREIGN KEY ("financialAccountId") REFERENCES "financial_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
