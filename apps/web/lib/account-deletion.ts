import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { asaasGateway, isAsaasNotFoundError } from "@/lib/payments/asaas";
import { getStripe } from "@/lib/stripe";
import { isStripeSubscriptionId } from "@/lib/stripe-subscription";

type AsaasSubscriptionRow = {
  providerSubscriptionId: string;
};

/** Cancela cobrança ativa antes de remover os dados locais da conta. */
export async function cancelBillingBeforeAccountDeletion(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) throw new Error("Usuário não encontrado");

  const subscription = user.subscription;
  const asaasSubscriptions = await prisma.$queryRaw<AsaasSubscriptionRow[]>(Prisma.sql`
    SELECT "providerSubscriptionId"
    FROM "payment_subscriptions"
    WHERE "userId" = ${userId}
      AND "provider" = 'ASAAS'
      AND "status" <> 'CANCELED'
    LIMIT 1
  `);

  const cancellationTasks: Promise<void>[] = [];
  if (
    subscription
    && subscription.status !== "CANCELED"
    && isStripeSubscriptionId(subscription.stripeSubscriptionId)
  ) {
    const stripe = getStripe();
    cancellationTasks.push(
      stripe.subscriptions.cancel(subscription.stripeSubscriptionId).then(() => undefined),
    );
  }

  const asaasSubscription = asaasSubscriptions[0];
  if (asaasSubscription) {
    cancellationTasks.push(
      asaasGateway.cancelSubscription(asaasSubscription.providerSubscriptionId).catch((error) => {
        // Um recurso já removido no Asaas não pode mais gerar novas cobranças.
        if (!isAsaasNotFoundError(error)) throw error;
      }),
    );
  }

  await Promise.all(cancellationTasks);
}
