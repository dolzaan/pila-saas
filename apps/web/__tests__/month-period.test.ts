import { describe, expect, it } from "vitest";
import {
  defaultDateForMonth,
  resolveMonthPeriod,
  shiftMonthKey,
} from "@/lib/month-period";

const NOW = new Date("2026-08-03T18:00:00.000Z");

describe("month period", () => {
  it("resolve o mês informado na zona de São Paulo", () => {
    const period = resolveMonthPeriod("2026-07", NOW);

    expect(period.key).toBe("2026-07");
    expect(period.label).toBe("Julho de 2026");
    expect(period.start.toISOString()).toBe("2026-07-01T03:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-08-01T03:00:00.000Z");
    expect(period.isPast).toBe(true);
  });

  it("não permite navegar para um mês futuro", () => {
    expect(resolveMonthPeriod("2026-09", NOW).key).toBe("2026-08");
  });

  it("volta ao mês atual quando o parâmetro é inválido", () => {
    expect(resolveMonthPeriod("agosto", NOW).key).toBe("2026-08");
  });

  it("navega corretamente na virada do ano", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2025-12", 1)).toBe("2026-01");
  });

  it("sugere uma data pertencente ao mês consultado", () => {
    const period = resolveMonthPeriod("2026-02", NOW);
    expect(defaultDateForMonth(period, NOW)).toBe("2026-02-03");
  });
});
