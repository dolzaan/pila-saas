import { describe, expect, it } from "vitest";
import { buildCashFlowForecast } from "@/lib/cash-flow-forecast";

const NOW = new Date("2026-07-19T15:00:00.000Z");

describe("cash flow forecast", () => {
  it("combina lançamentos, recorrências e lembretes em 30, 60 e 90 dias", () => {
    const forecast = buildCashFlowForecast({
      currentBalance: 1_000,
      now: NOW,
      futureTransactions: [
        {
          amount: 500,
          kind: "INCOME",
          description: "Freelance",
          occurredAt: "2026-07-29T12:00:00.000Z",
        },
        {
          amount: 100,
          kind: "EXPENSE",
          description: "Compra agendada",
          occurredAt: "2026-08-08T12:00:00.000Z",
        },
      ],
      recurringTransactions: [
        {
          amount: 50,
          kind: "EXPENSE",
          description: "Assinatura",
          interval: "WEEKLY",
          nextDate: "2026-07-24T12:00:00.000Z",
        },
      ],
      reminders: [
        {
          amount: 200,
          description: "IPVA",
          dueDate: "2026-08-03T12:00:00.000Z",
        },
      ],
    });

    expect(forecast.projected30).toBe(1_000);
    expect(forecast.projected60).toBe(800);
    expect(forecast.projected90).toBe(550);
    expect(forecast.events).toHaveLength(16);
    expect(forecast.firstNegativeDate).toBeNull();
  });

  it("traz pendências vencidas para hoje e aponta o primeiro saldo negativo", () => {
    const forecast = buildCashFlowForecast({
      currentBalance: 100,
      now: NOW,
      futureTransactions: [],
      recurringTransactions: [],
      reminders: [
        {
          amount: 150,
          description: "Conta vencida",
          dueDate: "2026-07-10T12:00:00.000Z",
        },
      ],
    });

    expect(forecast.events[0].date).toBe("2026-07-19");
    expect(forecast.points[0].balance).toBe(-50);
    expect(forecast.firstNegativeDate).toBe("2026-07-19");
    expect(forecast.lowestBalance).toBe(-50);
  });

  it("respeita adiamento e data final de recorrências", () => {
    const forecast = buildCashFlowForecast({
      currentBalance: 500,
      now: NOW,
      futureTransactions: [],
      recurringTransactions: [
        {
          amount: 100,
          kind: "EXPENSE",
          description: "Parcela",
          interval: "MONTHLY",
          nextDate: "2026-07-20T12:00:00.000Z",
          endDate: "2026-08-20T12:00:00.000Z",
        },
      ],
      reminders: [
        {
          amount: 75,
          description: "Conta adiada",
          dueDate: "2026-07-15T12:00:00.000Z",
          snoozedUntil: "2026-07-25T12:00:00.000Z",
        },
      ],
    });

    expect(forecast.events.map((event) => event.date)).toEqual([
      "2026-07-20",
      "2026-07-25",
      "2026-08-20",
    ]);
    expect(forecast.projected90).toBe(225);
  });
});
