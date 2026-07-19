-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM (
    'LOGIN',
    'PASSWORD_SET',
    'PASSWORD_CHANGED',
    'SESSIONS_REVOKED'
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_userId_createdAt_idx"
ON "security_events"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "security_events"
ADD CONSTRAINT "security_events_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
