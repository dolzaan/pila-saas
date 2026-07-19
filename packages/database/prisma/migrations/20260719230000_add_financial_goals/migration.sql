-- CreateTable
CREATE TABLE "financial_goals" (
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

-- CreateIndex
CREATE INDEX "financial_goals_userId_completedAt_idx"
ON "financial_goals"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "financial_goals_userId_targetDate_idx"
ON "financial_goals"("userId", "targetDate");

-- AddForeignKey
ALTER TABLE "financial_goals"
ADD CONSTRAINT "financial_goals_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
