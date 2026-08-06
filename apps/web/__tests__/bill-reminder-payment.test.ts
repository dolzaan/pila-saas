import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  executeRaw: vi.fn(),
  findReminder: vi.fn(),
  findRecurring: vi.fn(),
  findTransaction: vi.fn(),
  createTransaction: vi.fn(),
  updateReminder: vi.fn(),
  confirmRecurringPayment: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.runTransaction },
}));

vi.mock("@/lib/recurring-payments", () => ({
  confirmRecurringPayment: mocks.confirmRecurringPayment,
}));

import { recordBillReminderPayment } from "@/lib/bill-reminder-payment";

const transactionClient = {
  $executeRaw: mocks.executeRaw,
  billReminder: {
    findFirst: mocks.findReminder,
    update: mocks.updateReminder,
  },
  recurringTransaction: { findFirst: mocks.findRecurring },
  transaction: {
    findUnique: mocks.findTransaction,
    create: mocks.createTransaction,
  },
};

const reminder = {
  id: "reminder_1",
  description: "Energia",
  amount: { toNumber: () => 180 },
  dueDate: new Date("2026-08-10T12:00:00.000Z"),
  isPaid: false,
};

describe("recordBillReminderPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTransaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.findReminder.mockResolvedValue(reminder);
    mocks.findRecurring.mockResolvedValue(null);
    mocks.findTransaction.mockResolvedValue(null);
    mocks.createTransaction.mockResolvedValue({ id: "transaction_1" });
    mocks.updateReminder.mockResolvedValue(reminder);
  });

  it("registra a despesa e marca um lembrete avulso como pago", async () => {
    const paidAt = new Date("2026-08-06T15:00:00.000Z");
    const result = await recordBillReminderPayment("user_1", reminder.id, paidAt);

    expect(mocks.createTransaction).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        amount: reminder.amount,
        kind: "EXPENSE",
        occurredAt: paidAt,
        source: "reminder",
        importFingerprint: "bill-reminder-payment:reminder_1",
      }),
      select: { id: true },
    });
    expect(mocks.updateReminder).toHaveBeenCalledWith({
      where: { id: reminder.id },
      data: { isPaid: true, paidAt, snoozedUntil: null },
    });
    expect(result).toEqual({
      success: true,
      transactionId: "transaction_1",
      alreadyRecorded: false,
    });
  });

  it("avança a recorrência pelo mesmo fluxo usado no painel", async () => {
    mocks.findRecurring.mockResolvedValue({ id: "recurring_1" });
    mocks.confirmRecurringPayment.mockResolvedValue({
      transactionId: "transaction_recurring",
      alreadyRecorded: false,
    });

    const result = await recordBillReminderPayment("user_1", reminder.id);

    expect(mocks.confirmRecurringPayment).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user_1",
      recurringTransactionId: "recurring_1",
      expectedDueDate: reminder.dueDate,
      amount: 180,
    }));
    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(result.transactionId).toBe("transaction_recurring");
  });

  it("não duplica o lançamento de um lembrete já pago", async () => {
    mocks.findReminder.mockResolvedValue({ ...reminder, isPaid: true });
    mocks.findTransaction.mockResolvedValue({ id: "transaction_existing" });

    const result = await recordBillReminderPayment("user_1", reminder.id);

    expect(mocks.createTransaction).not.toHaveBeenCalled();
    expect(mocks.updateReminder).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      transactionId: "transaction_existing",
      alreadyRecorded: true,
    });
  });
});
