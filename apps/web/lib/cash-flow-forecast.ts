import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
} from "date-fns";
import type { RecurrenceInterval, TransactionKind } from "@prisma/client";
import { parseReminderDate, reminderDateKey, saoPauloDateKey } from "@/lib/reminders";

type ForecastTransaction = {
  amount: number;
  kind: TransactionKind;
  description?: string | null;
  occurredAt: Date | string;
};

type ForecastRecurringTransaction = {
  amount: number;
  kind: TransactionKind;
  description?: string | null;
  interval: RecurrenceInterval;
  nextDate: Date | string;
  endDate?: Date | string | null;
};

type ForecastReminder = {
  amount: number;
  description: string;
  dueDate: Date | string;
  snoozedUntil?: Date | string | null;
};

export type ForecastEvent = {
  date: string;
  amount: number;
  kind: TransactionKind;
  description: string;
  source: "TRANSACTION" | "RECURRING" | "REMINDER";
};

export type ForecastPoint = {
  date: string;
  balance: number;
  income: number;
  expense: number;
};

export type CashFlowForecast = {
  points: ForecastPoint[];
  events: ForecastEvent[];
  projected30: number;
  projected60: number;
  projected90: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  firstNegativeDate: string | null;
};

type CashFlowForecastInput = {
  currentBalance: number;
  futureTransactions: ForecastTransaction[];
  recurringTransactions: ForecastRecurringTransaction[];
  reminders: ForecastReminder[];
  now?: Date;
  horizonDays?: number;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function addInterval(date: Date, interval: RecurrenceInterval) {
  if (interval === "DAILY") return addDays(date, 1);
  if (interval === "WEEKLY") return addWeeks(date, 1);
  if (interval === "YEARLY") return addYears(date, 1);
  return addMonths(date, 1);
}

function displayDateKey(value: Date | string) {
  return reminderDateKey(toDate(value));
}

function clampEventDate(date: string, today: string) {
  return date < today ? today : date;
}

function createProjectionDate(dateKey: string) {
  const date = parseReminderDate(dateKey);
  if (!date) throw new Error(`Data inválida na projeção: ${dateKey}`);
  return date;
}

export function buildCashFlowForecast({
  currentBalance,
  futureTransactions,
  recurringTransactions,
  reminders,
  now = new Date(),
  horizonDays = 90,
}: CashFlowForecastInput): CashFlowForecast {
  const todayKey = saoPauloDateKey(now);
  const today = createProjectionDate(todayKey);
  const horizon = addDays(today, horizonDays);
  const horizonKey = displayDateKey(horizon);
  const events: ForecastEvent[] = [];

  for (const transaction of futureTransactions) {
    const date = displayDateKey(transaction.occurredAt);
    if (date <= todayKey || date > horizonKey) continue;
    events.push({
      date,
      amount: transaction.amount,
      kind: transaction.kind,
      description: transaction.description || "Lançamento futuro",
      source: "TRANSACTION",
    });
  }

  for (const recurring of recurringTransactions) {
    let occurrence = toDate(recurring.nextDate);
    const endDate = recurring.endDate ? toDate(recurring.endDate) : null;
    let guard = 0;

    while (
      displayDateKey(occurrence) <= horizonKey &&
      (!endDate || occurrence <= endDate) &&
      guard < 500
    ) {
      events.push({
        date: clampEventDate(displayDateKey(occurrence), todayKey),
        amount: recurring.amount,
        kind: recurring.kind,
        description: recurring.description || "Lançamento recorrente",
        source: "RECURRING",
      });
      occurrence = addInterval(occurrence, recurring.interval);
      guard += 1;
    }
  }

  for (const reminder of reminders) {
    const effectiveDate =
      reminder.snoozedUntil && displayDateKey(reminder.snoozedUntil) > todayKey
        ? displayDateKey(reminder.snoozedUntil)
        : displayDateKey(reminder.dueDate);
    if (effectiveDate > horizonKey) continue;
    events.push({
      date: clampEventDate(effectiveDate, todayKey),
      amount: reminder.amount,
      kind: "EXPENSE",
      description: reminder.description,
      source: "REMINDER",
    });
  }

  events.sort((left, right) => {
    const byDate = left.date.localeCompare(right.date);
    return byDate || left.description.localeCompare(right.description);
  });

  const amountsByDate = new Map<string, { income: number; expense: number }>();
  for (const event of events) {
    const current = amountsByDate.get(event.date) || { income: 0, expense: 0 };
    if (event.kind === "INCOME") current.income += event.amount;
    else current.expense += event.amount;
    amountsByDate.set(event.date, current);
  }

  let balance = currentBalance;
  let lowestBalance = currentBalance;
  let lowestBalanceDate = todayKey;
  let firstNegativeDate: string | null = currentBalance < 0 ? todayKey : null;
  const points: ForecastPoint[] = [];

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const date = addDays(today, offset);
    const dateKey = displayDateKey(date);
    const amounts = amountsByDate.get(dateKey) || { income: 0, expense: 0 };
    balance += amounts.income - amounts.expense;
    balance = Math.round((balance + Number.EPSILON) * 100) / 100;

    points.push({
      date: dateKey,
      balance,
      income: amounts.income,
      expense: amounts.expense,
    });

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = dateKey;
    }
    if (balance < 0 && !firstNegativeDate) firstNegativeDate = dateKey;
  }

  const balanceAt = (day: number) => points[Math.min(day, points.length - 1)]?.balance ?? balance;

  return {
    points,
    events,
    projected30: balanceAt(30),
    projected60: balanceAt(60),
    projected90: balanceAt(90),
    lowestBalance,
    lowestBalanceDate,
    firstNegativeDate,
  };
}

export function forecastDaysFromToday(date: string, now = new Date()) {
  const target = createProjectionDate(date);
  const today = createProjectionDate(saoPauloDateKey(now));
  return differenceInCalendarDays(target, today);
}
