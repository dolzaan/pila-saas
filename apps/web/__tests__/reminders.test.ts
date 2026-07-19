import { describe, expect, it } from "vitest";
import {
  daysFromToday,
  getReminderStatus,
  parseReminderDate,
  saoPauloDayBounds,
  saoPauloDateKey,
} from "@/lib/reminders";

const NOW = new Date("2026-07-19T15:00:00.000Z");

describe("reminder helpers", () => {
  it("usa a data de São Paulo como referência", () => {
    expect(saoPauloDateKey(NOW)).toBe("2026-07-19");
    expect(saoPauloDateKey(new Date("2026-07-19T01:00:00.000Z"))).toBe("2026-07-18");
  });

  it("valida datas reais e armazena ao meio-dia UTC", () => {
    expect(parseReminderDate("2026-02-29")).toBeNull();
    expect(parseReminderDate("2026-07-19")?.toISOString()).toBe("2026-07-19T12:00:00.000Z");
  });

  it("classifica lembretes pagos, vencidos, de hoje e futuros", () => {
    expect(getReminderStatus({ isPaid: true, dueDate: "2026-07-10" }, NOW)).toBe("PAID");
    expect(getReminderStatus({ isPaid: false, dueDate: "2026-07-18" }, NOW)).toBe("OVERDUE");
    expect(getReminderStatus({ isPaid: false, dueDate: "2026-07-19" }, NOW)).toBe("TODAY");
    expect(getReminderStatus({ isPaid: false, dueDate: "2026-07-20" }, NOW)).toBe("UPCOMING");
  });

  it("mantém como adiado enquanto a nova data estiver no futuro", () => {
    expect(
      getReminderStatus(
        {
          isPaid: false,
          dueDate: "2026-07-10",
          snoozedUntil: "2026-07-22",
        },
        NOW,
      ),
    ).toBe("SNOOZED");
  });

  it("calcula dias restantes sem depender do fuso do servidor", () => {
    expect(daysFromToday("2026-07-22", NOW)).toBe(3);
    expect(daysFromToday("2026-07-17", NOW)).toBe(-2);
  });

  it("calcula o início e o fim do dia usado pelo cron", () => {
    expect(saoPauloDayBounds(NOW)).toEqual({
      start: new Date("2026-07-19T03:00:00.000Z"),
      end: new Date("2026-07-20T02:59:59.999Z"),
    });
  });
});
