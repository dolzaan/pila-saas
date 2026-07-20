"use server";

import { auth } from "@/lib/auth";
import {
  completeUserOnboarding,
  saveUserOnboardingStep,
  skipUserOnboarding,
} from "@/lib/onboarding";
import { revalidatePath } from "next/cache";

export async function updateOnboardingStep(step: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    await saveUserOnboardingStep(session.user.id, step);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("[updateOnboardingStep]", error);
    return { error: "Não foi possível salvar o progresso do guia." };
  }
}

export async function finishOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    await completeUserOnboarding(session.user.id);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("[finishOnboarding]", error);
    return { error: "Não foi possível concluir o guia." };
  }
}

export async function skipOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autorizado." };

  try {
    await skipUserOnboarding(session.user.id);
    revalidatePath("/dashboard", "layout");
    return { success: true };
  } catch (error) {
    console.error("[skipOnboarding]", error);
    return { error: "Não foi possível fechar o guia agora." };
  }
}
