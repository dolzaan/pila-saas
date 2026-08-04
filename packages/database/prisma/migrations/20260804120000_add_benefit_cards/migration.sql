CREATE TYPE "BenefitCardType" AS ENUM ('FOOD', 'MEAL', 'MOBILITY', 'CULTURE', 'FLEXIBLE');

ALTER TYPE "FinancialAccountType" ADD VALUE 'BENEFIT_CARD';

ALTER TABLE "financial_accounts"
ADD COLUMN "benefitType" "BenefitCardType",
ADD COLUMN "expectedRecharge" DECIMAL(12, 2),
ADD COLUMN "rechargeDay" INTEGER,
ADD COLUMN "balanceCarriesOver" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "financial_accounts"
ADD CONSTRAINT "financial_accounts_rechargeDay_check"
CHECK ("rechargeDay" IS NULL OR ("rechargeDay" >= 1 AND "rechargeDay" <= 31));
