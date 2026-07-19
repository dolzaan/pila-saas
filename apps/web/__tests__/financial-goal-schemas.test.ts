import { describe, expect, it } from "vitest";
import {
  FinancialGoalContributionSchema,
  FinancialGoalSchema,
} from "../lib/schemas";

describe("FinancialGoalSchema", () => {
  it("valida uma meta com valor inicial e prazo", () => {
    expect(
      FinancialGoalSchema.safeParse({
        name: "Reserva de emergência",
        icon: "🛟",
        targetAmount: 10_000,
        savedAmount: 2_500,
        targetDate: "2027-07-19",
      }).success,
    ).toBe(true);
  });

  it("rejeita valor guardado maior que o objetivo", () => {
    expect(
      FinancialGoalSchema.safeParse({
        name: "Viagem",
        icon: "✈️",
        targetAmount: 5_000,
        savedAmount: 6_000,
        targetDate: "",
      }).success,
    ).toBe(false);
  });
});

describe("FinancialGoalContributionSchema", () => {
  it("aceita aportes e retiradas positivas", () => {
    expect(
      FinancialGoalContributionSchema.safeParse({
        amount: 250,
        operation: "DEPOSIT",
      }).success,
    ).toBe(true);
  });

  it("rejeita valores negativos", () => {
    expect(
      FinancialGoalContributionSchema.safeParse({
        amount: -10,
        operation: "WITHDRAW",
      }).success,
    ).toBe(false);
  });
});
