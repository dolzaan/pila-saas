CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_events_eventName_createdAt_idx"
  ON "product_events"("eventName", "createdAt");
CREATE INDEX "product_events_userId_createdAt_idx"
  ON "product_events"("userId", "createdAt");
CREATE INDEX "product_events_visitorId_createdAt_idx"
  ON "product_events"("visitorId", "createdAt");

ALTER TABLE "product_events"
  ADD CONSTRAINT "product_events_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
