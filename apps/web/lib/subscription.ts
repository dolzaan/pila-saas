export type SubStatusResult = {
  status: "TRIALING" | "ACTIVE" | "EXPIRED" | "PAST_DUE" | "CANCELED";
  daysLeft: number;
  expiresAt: Date;
  plan: string;
};

export function getUserSubscriptionStatus(
  createdAt: Date,
  subscription?: {
    status: string;
    currentPeriodEnd: Date | null;
    plan: string;
  } | null
): SubStatusResult {
  const now = new Date();

  // Se o usuário tem uma assinatura não-inativa, calculamos com base nela
  if (subscription && subscription.status !== "INACTIVE") {
    const expiresAt = subscription.currentPeriodEnd || now;
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Se estiver cancelado ou past_due mas ainda tiver dias, podemos considerar active/expiring
    // Mas para simplificar, confiamos no status retornado pelo Stripe
    return {
      status: subscription.status as any,
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      expiresAt: expiresAt,
      plan: subscription.plan,
    };
  }

  // Sem assinatura ativa -> Lógica de 7 dias de Free Trial
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
      plan: "free",
    };
  }

  return {
    status: "EXPIRED",
    daysLeft: 0,
    expiresAt: trialEnd,
    plan: "free",
  };
}
