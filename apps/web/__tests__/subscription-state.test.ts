import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  executeRaw: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.runTransaction },
}));

import { applyOrderedSubscriptionState } from "@/lib/payments/subscription-state";

const transactionClient = {
  $executeRaw: mocks.executeRaw,
  subscription: {
    findUnique: mocks.findUnique,
    update: mocks.update,
    create: mocks.create,
  },
};

const existing = {
  id: "local_subscription_1",
  userId: "user_1",
  stripeSubscriptionId: "sub_1",
  status: "ACTIVE",
  plan: "pro",
  currentPeriodEnd: null,
  lastPaymentEventAt: new Date("2026-08-06T13:00:00.000Z"),
  lastPaymentEventId: "evt_new",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("applyOrderedSubscriptionState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTransaction.mockImplementation(async (callback) => callback(transactionClient));
    mocks.findUnique.mockResolvedValue(existing);
    mocks.update.mockResolvedValue(existing);
    mocks.create.mockResolvedValue(existing);
  });

  it("ignora evento mais antigo que o estado já aplicado", async () => {
    const result = await applyOrderedSubscriptionState({
      provider: "stripe",
      eventId: "evt_old",
      eventAt: new Date("2026-08-06T12:59:59.000Z"),
      providerSubscriptionId: "sub_1",
      status: "PAST_DUE",
      userId: "user_1",
    });

    expect(result).toMatchObject({ applied: false, stale: true });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("ignora a repetição do mesmo evento", async () => {
    const result = await applyOrderedSubscriptionState({
      provider: "stripe",
      eventId: "evt_new",
      eventAt: new Date("2026-08-06T13:00:00.000Z"),
      providerSubscriptionId: "sub_1",
      status: "ACTIVE",
      userId: "user_1",
    });

    expect(result).toMatchObject({ applied: false, duplicate: true });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("aplica evento mais novo sob trava transacional", async () => {
    const eventAt = new Date("2026-08-06T13:01:00.000Z");
    await applyOrderedSubscriptionState({
      provider: "stripe",
      eventId: "evt_latest",
      eventAt,
      providerSubscriptionId: "sub_1",
      status: "PAST_DUE",
      userId: "user_1",
    });

    expect(mocks.executeRaw).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: existing.id },
      data: expect.objectContaining({
        status: "PAST_DUE",
        lastPaymentEventAt: eventAt,
        lastPaymentEventId: "evt_latest",
      }),
    });
  });
});
