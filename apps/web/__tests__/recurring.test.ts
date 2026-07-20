import { describe, expect, it } from "vitest";
import { getNextRecurringDate } from "@/lib/recurring";

describe("getNextRecurringDate", () => {
  it("avança recorrências diárias e semanais", () => {
    const date = new Date("2026-07-19T12:00:00.000Z");

    expect(getNextRecurringDate(date, "DAILY").toISOString()).toBe(
      "2026-07-20T12:00:00.000Z",
    );
    expect(getNextRecurringDate(date, "WEEKLY").toISOString()).toBe(
      "2026-07-26T12:00:00.000Z",
    );
  });

  it("respeita meses curtos e anos", () => {
    expect(
      getNextRecurringDate(
        new Date("2026-01-31T12:00:00.000Z"),
        "MONTHLY",
      ).toISOString(),
    ).toBe("2026-02-28T12:00:00.000Z");

    expect(
      getNextRecurringDate(
        new Date("2024-02-29T12:00:00.000Z"),
        "YEARLY",
      ).toISOString(),
    ).toBe("2025-02-28T12:00:00.000Z");
  });
});
