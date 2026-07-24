import { afterEach, describe, expect, it } from "vitest";
import { mapAsaasSubscriptionStatus } from "../lib/payments/asaas";
import {
  getAsaasExternalReference,
  getAsaasSubscriptionId,
  isValidAsaasWebhookToken,
  mapAsaasPaymentEvent,
} from "../lib/payments/asaas-webhook";

describe("mapAsaasSubscriptionStatus", () => {
  it.each([
    ["ACTIVE", "ACTIVE"],
    ["INACTIVE", "INACTIVE"],
    ["EXPIRED", "CANCELED"],
    ["UNKNOWN", "INACTIVE"],
  ] as const)("converte %s para %s", (asaasStatus, localStatus) => {
    expect(mapAsaasSubscriptionStatus(asaasStatus)).toBe(localStatus);
  });
});

describe("mapAsaasPaymentEvent", () => {
  it.each([
    ["PAYMENT_CONFIRMED", "ACTIVE"],
    ["PAYMENT_RECEIVED", "ACTIVE"],
    ["PAYMENT_OVERDUE", "PAST_DUE"],
    ["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAST_DUE"],
    ["PAYMENT_REFUNDED", "INACTIVE"],
    ["SUBSCRIPTION_DELETED", "CANCELED"],
  ] as const)("converte %s para %s", (event, localStatus) => {
    expect(mapAsaasPaymentEvent(event)).toBe(localStatus);
  });

  it("ignora eventos sem impacto no acesso", () => {
    expect(mapAsaasPaymentEvent("PAYMENT_CREATED")).toBeNull();
  });
});

describe("helpers do webhook", () => {
  afterEach(() => {
    delete process.env.ASAAS_WEBHOOK_TOKEN;
  });

  it("valida o token configurado", () => {
    process.env.ASAAS_WEBHOOK_TOKEN = "token-seguro";
    expect(isValidAsaasWebhookToken("token-seguro")).toBe(true);
    expect(isValidAsaasWebhookToken("token-errado")).toBe(false);
  });

  it("extrai referência e assinatura de eventos de pagamento", () => {
    const payload = {
      id: "evt_1",
      event: "PAYMENT_CONFIRMED",
      payment: {
        id: "pay_1",
        subscription: "sub_1",
        externalReference: "user_1",
      },
    };

    expect(getAsaasExternalReference(payload)).toBe("user_1");
    expect(getAsaasSubscriptionId(payload)).toBe("sub_1");
  });
});
