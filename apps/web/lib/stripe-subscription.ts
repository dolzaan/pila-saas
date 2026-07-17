import type Stripe from "stripe";

export type LocalSubscriptionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED";

export function isStripeSubscriptionId(value: string | null | undefined): boolean {
  return value?.startsWith("sub_") ?? false;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): LocalSubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      return "INACTIVE";
  }
}

export function getCurrentPeriodEnd(subscription: Stripe.Subscription): Date {
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  if (!currentPeriodEnd) {
    throw new Error("Subscription period end not found");
  }

  return new Date(currentPeriodEnd * 1000);
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;

  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}
