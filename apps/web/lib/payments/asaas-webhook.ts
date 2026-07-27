import type { LocalSubscriptionStatus } from "./types";

export interface AsaasWebhookPayload {
  id: string;
  event: string;
  payment?: {
    id: string;
    customer?: string;
    subscription?: string;
    externalReference?: string | null;
    dueDate?: string;
  };
  subscription?: {
    id: string;
    customer?: string;
    externalReference?: string | null;
    nextDueDate?: string;
    status?: string;
  };
  checkout?: {
    id: string;
    status?: string;
    customer?: string;
    externalReference?: string | null;
    subscription?: {
      cycle?: string;
      nextDueDate?: string;
      endDate?: string;
    } | null;
  };
}

export function isValidAsaasWebhookToken(receivedToken: string | null): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken || !receivedToken) return false;

  if (receivedToken.length !== expectedToken.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expectedToken.length; index += 1) {
    mismatch |= expectedToken.charCodeAt(index) ^ receivedToken.charCodeAt(index);
  }

  return mismatch === 0;
}

export function mapAsaasPaymentEvent(event: string): LocalSubscriptionStatus | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "CHECKOUT_PAID":
      return "ACTIVE";
    case "PAYMENT_OVERDUE":
    case "PAYMENT_CREDIT_CARD_CAPTURE_REFUSED":
      return "PAST_DUE";
    case "PAYMENT_REFUNDED":
    case "PAYMENT_DELETED":
    case "CHECKOUT_CANCELED":
    case "CHECKOUT_EXPIRED":
      return "INACTIVE";
    case "SUBSCRIPTION_INACTIVATED":
    case "SUBSCRIPTION_DELETED":
      return "CANCELED";
    default:
      return null;
  }
}

export function getAsaasExternalReference(payload: AsaasWebhookPayload): string | null {
  return (
    payload.payment?.externalReference ??
    payload.subscription?.externalReference ??
    payload.checkout?.externalReference ??
    null
  );
}

export function getAsaasSubscriptionId(payload: AsaasWebhookPayload): string | null {
  return payload.payment?.subscription ?? payload.subscription?.id ?? null;
}
