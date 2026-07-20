-- Estado persistente do guia de primeiros passos.
-- Usuários existentes são marcados como concluídos para que o tutorial apareça
-- automaticamente apenas para contas criadas depois desta migration.
CREATE TABLE "user_onboarding" (
  "userId" TEXT NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "user_onboarding_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "user_onboarding" (
  "userId",
  "step",
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  3,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
ON CONFLICT ("userId") DO NOTHING;
