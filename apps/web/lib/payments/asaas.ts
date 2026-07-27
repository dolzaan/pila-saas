import type {
  CreatePaymentCustomerInput,
  CreateSubscriptionInput,
  LocalSubscriptionStatus,
  PaymentCustomerResult,
  PaymentGateway,
  SubscriptionPaymentResult,
  SubscriptionResult,
} from "./types";

const DEFAULT_TIMEOUT_MS = 12_000;

interface AsaasErrorPayload {
  errors?: Array<{ code?: string; description?: string }>;
}

interface AsaasCustomerResponse {
  id: string;
}

interface AsaasSubscriptionResponse {
  id: string;
  status: string;
  nextDueDate?: string;
}

interface AsaasPaymentsResponse {
  data?: Array<{
    id: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    dueDate?: string;
  }>;
}

function getAsaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY;
  const apiUrl = process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3";

  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");
  return { apiKey, apiUrl: apiUrl.replace(/\/$/, "") };
}

export function mapAsaasSubscriptionStatus(status: string): LocalSubscriptionStatus {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "EXPIRED":
      return "CANCELED";
    case "INACTIVE":
      return "INACTIVE";
    default:
      return "INACTIVE";
  }
}

async function asaasRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        access_token: apiKey,
        ...init.headers,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as AsaasErrorPayload;
      const message = payload.errors?.map((error) => error.description).filter(Boolean).join("; ");
      throw new Error(message || `Asaas respondeu com HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export class AsaasGateway implements PaymentGateway {
  async createCustomer(input: CreatePaymentCustomerInput): Promise<PaymentCustomerResult> {
    return asaasRequest<AsaasCustomerResponse>("/customers", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
    const subscription = await asaasRequest<AsaasSubscriptionResponse>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: input.customerId,
        billingType: input.billingType,
        value: input.value,
        nextDueDate: input.nextDueDate,
        cycle: input.cycle,
        description: input.description,
        externalReference: input.externalReference,
      }),
    });

    return {
      id: subscription.id,
      status: mapAsaasSubscriptionStatus(subscription.status),
      nextDueDate: subscription.nextDueDate,
    };
  }

  async getFirstSubscriptionPayment(subscriptionId: string): Promise<SubscriptionPaymentResult | null> {
    const query = new URLSearchParams({ subscription: subscriptionId, limit: "1", offset: "0" });
    const response = await asaasRequest<AsaasPaymentsResponse>(`/payments?${query.toString()}`);
    return response.data?.[0] ?? null;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await asaasRequest<void>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "DELETE",
    });
  }
}

export const asaasGateway = new AsaasGateway();
