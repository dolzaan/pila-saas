export type SubStatusResult = {
  status: "TRIALING" | "ACTIVE" | "EXPIRED" | "PAST_DUE" | "CANCELED";
  daysLeft: number;
  expiresAt: Date;
  plan: string;
};

export function hasProAccess(subscription: SubStatusResult): boolean {
  return subscription.status === "ACTIVE" || subscription.status === "TRIALING";
}

export function getUserSubscriptionStatus(
  createdAt: Date,
  subscription?: {
    status: string;
    currentPeriodEnd: Date | null;
    plan: string;
  } | null
): SubStatusResult {
  const now = new Date();

  const subscriptionStatus = subscription?.status;
  const hasKnownSubscriptionStatus =
    subscriptionStatus === "ACTIVE" ||
    subscriptionStatus === "TRIALING" ||
    subscriptionStatus === "PAST_DUE" ||
    subscriptionStatus === "CANCELED";

  // Se o usuário tem uma assinatura não-inativa, calculamos com base nela
  if (subscription && hasKnownSubscriptionStatus) {
    const expiresAt = subscription.currentPeriodEnd || now;
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Se estiver cancelado ou past_due mas ainda tiver dias, podemos considerar active/expiring
    // Mas para simplificar, confiamos no status retornado pelo Stripe
    return {
      status: subscriptionStatus,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      expiresAt: expiresAt,
      plan: subscription.plan,
    };
  }

  // Sem assinatura ativa -> 7 dias de acesso completo ao Pila Pro
  const trialDays = 7;
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + trialDays);

  const diffMs = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft > 0) {
    return {
      status: "TRIALING",
      daysLeft,
      expiresAt: trialEnd,
      plan: "pro",
    };
  }

  return {
    status: "EXPIRED",
    daysLeft: 0,
    expiresAt: trialEnd,
    plan: "free",
  };
}
