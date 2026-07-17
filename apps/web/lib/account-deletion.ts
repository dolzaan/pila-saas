import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isStripeSubscriptionId } from "@/lib/stripe-subscription";

/** Cancela cobrança ativa antes de remover os dados locais da conta. */
export async function cancelBillingBeforeAccountDeletion(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const subscription = user.subscription;
  if (
    subscription
    && subscription.status !== "CANCELED"
    && isStripeSubscriptionId(subscription.stripeSubscriptionId)
  ) {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
  }
}
