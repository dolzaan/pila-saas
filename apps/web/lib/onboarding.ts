import { prisma } from "@/lib/prisma";

export const PILA_ONBOARDING_LAST_STEP = 3;

export type UserOnboardingState = {
  step: number;
  completedAt: Date | null;
  skippedAt: Date | null;
};

type UserOnboardingRow = {
  step: number;
  completedAt: Date | null;
  skippedAt: Date | null;
};

function clampStep(step: number) {
  if (!Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(PILA_ONBOARDING_LAST_STEP, Math.trunc(step)));
}

export async function getUserOnboardingState(
  userId: string,
): Promise<UserOnboardingState> {
  const rows = await prisma.$queryRaw<UserOnboardingRow[]>`
    SELECT "step", "completedAt", "skippedAt"
    FROM "user_onboarding"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  const state = rows[0];
  if (!state) {
    return { step: 0, completedAt: null, skippedAt: null };
  }

  return {
    step: clampStep(state.step),
    completedAt: state.completedAt,
    skippedAt: state.skippedAt,
  };
}

export async function saveUserOnboardingStep(userId: string, step: number) {
  const safeStep = clampStep(step);

  await prisma.$executeRaw`
    INSERT INTO "user_onboarding" (
      "userId",
      "step",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${userId},
      ${safeStep},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "step" = ${safeStep},
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function completeUserOnboarding(userId: string) {
  await prisma.$executeRaw`
    INSERT INTO "user_onboarding" (
      "userId",
      "step",
      "completedAt",
      "skippedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${userId},
      ${PILA_ONBOARDING_LAST_STEP},
      CURRENT_TIMESTAMP,
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "step" = ${PILA_ONBOARDING_LAST_STEP},
      "completedAt" = CURRENT_TIMESTAMP,
      "skippedAt" = NULL,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function skipUserOnboarding(userId: string) {
  await prisma.$executeRaw`
    INSERT INTO "user_onboarding" (
      "userId",
      "step",
      "skippedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${userId},
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "skippedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}
