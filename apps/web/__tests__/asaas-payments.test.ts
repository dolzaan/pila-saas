import { afterEach, describe, expect, it } from "vitest";
import {
  AsaasApiError,
  isAsaasNotFoundError,
  mapAsaasSubscriptionStatus,
} from "../lib/payments/asaas";
import {
  getAsaasEventOccurredAt,
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

describe("erros da API do Asaas", () => {
  it("reconhece somente HTTP 404 como recurso já removido", () => {
    expect(isAsaasNotFoundError(new AsaasApiError("Não encontrado", 404))).toBe(true);
    expect(isAsaasNotFoundError(new AsaasApiError("Indisponível", 503))).toBe(false);
    expect(isAsaasNotFoundError(new Error("Falha genérica"))).toBe(false);
  });
});

describe("mapAsaasPaymentEvent", () => {
  it.each([
    ["PAYMENT_CONFIRMED", "ACTIVE"],
    ["PAYMENT_RECEIVED", "ACTIVE"],
    ["CHECKOUT_PAID", "ACTIVE"],
    ["PAYMENT_OVERDUE", "PAST_DUE"],
    ["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAST_DUE"],
    ["PAYMENT_REFUNDED", "INACTIVE"],
    ["CHECKOUT_CANCELED", "INACTIVE"],
    ["CHECKOUT_EXPIRED", "INACTIVE"],
    ["SUBSCRIPTION_DELETED", "CANCELED"],
  ] as const)("converte %s para %s", (event, localStatus) => {
    expect(mapAsaasPaymentEvent(event)).toBe(localStatus);
  });

  it("ignora eventos sem impacto no acesso", () => {
    expect(mapAsaasPaymentEvent("PAYMENT_CREATED")).toBeNull();
  });
});

describe("helpers do webhook", () => {
  it("usa a data de criação do evento para impedir regressão de estado", () => {
    const fallback = new Date("2026-08-06T13:00:00.000Z");
    expect(getAsaasEventOccurredAt({
      id: "evt_1",
      event: "PAYMENT_CONFIRMED",
      dateCreated: "2026-08-06T09:59:30-03:00",
    }, fallback)).toEqual(new Date("2026-08-06T12:59:30.000Z"));
    expect(getAsaasEventOccurredAt({
      id: "evt_2",
      event: "PAYMENT_CONFIRMED",
      dateCreated: "inválida",
    }, fallback)).toBe(fallback);
  });

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

  it("extrai o usuário de um checkout pago", () => {
    const payload = {
      id: "evt_checkout_1",
      event: "CHECKOUT_PAID",
      checkout: {
        id: "checkout_1",
        status: "PAID",
        externalReference: "user_2",
      },
    };

    expect(getAsaasExternalReference(payload)).toBe("user_2");
    expect(getAsaasSubscriptionId(payload)).toBeNull();
  });
});
