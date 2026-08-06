import type {
  CheckoutResult,
  CreatePaymentCustomerInput,
  CreateRecurringCheckoutInput,
  CreateSubscriptionInput,
  LocalSubscriptionStatus,
  PaymentCustomerResult,
  PaymentGateway,
  SubscriptionPaymentResult,
  SubscriptionResult,
  UpdatePaymentCustomerInput,
} from "./types";

const DEFAULT_TIMEOUT_MS = 12_000;
const CARD_TIMEOUT_MS = 65_000;

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

interface AsaasCheckoutResponse {
  id: string;
  link: string;
  status: string;
  externalReference?: string | null;
}

interface AsaasPaymentsResponse {
  data?: Array<{
    id: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    dueDate?: string;
    status?: string;
  }>;
}

export class AsaasApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AsaasApiError";
  }
}

export function isAsaasNotFoundError(error: unknown): boolean {
  return error instanceof AsaasApiError && error.status === 404;
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

async function asaasRequest<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const { apiKey, apiUrl } = getAsaasConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      throw new AsaasApiError(
        message || `Asaas respondeu com HTTP ${response.status}`,
        response.status,
      );
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

  async updateCustomer(
    customerId: string,
    input: UpdatePaymentCustomerInput,
  ): Promise<PaymentCustomerResult> {
    return asaasRequest<AsaasCustomerResponse>(`/customers/${encodeURIComponent(customerId)}`, {
      method: "PUT",
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

  async createRecurringCheckout(input: CreateRecurringCheckoutInput): Promise<CheckoutResult> {
    return asaasRequest<AsaasCheckoutResponse>(
      "/checkouts",
      {
        method: "POST",
        body: JSON.stringify({
          billingTypes: ["CREDIT_CARD"],
          chargeTypes: ["RECURRENT"],
          minutesToExpire: 60,
          externalReference: input.externalReference,
          callback: input.callback,
          items: [
            {
              externalReference: "pila-pro-monthly",
              name: "Pila Pro",
              description: "Assinatura mensal do Pila Pro",
              quantity: 1,
              value: input.value,
            },
          ],
          customerData: input.customerData,
          subscription: {
            cycle: "MONTHLY",
            nextDueDate: input.nextDueDate,
          },
        }),
      },
      CARD_TIMEOUT_MS,
    );
  }

  async getCheckout(checkoutId: string): Promise<CheckoutResult> {
    return asaasRequest<AsaasCheckoutResponse>(`/checkouts/${encodeURIComponent(checkoutId)}`);
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
