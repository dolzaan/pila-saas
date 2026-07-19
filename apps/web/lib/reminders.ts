export type ReminderStatus = "PAID" | "SNOOZED" | "OVERDUE" | "TODAY" | "UPCOMING";

type ReminderStatusInput = {
  isPaid: boolean;
  dueDate: Date | string;
  snoozedUntil?: Date | string | null;
};

function dateFromInput(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function saoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseReminderDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function reminderDateKey(value: Date | string) {
  const date = dateFromInput(value);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getReminderStatus(
  reminder: ReminderStatusInput,
  now = new Date(),
): ReminderStatus {
  if (reminder.isPaid) return "PAID";

  const today = saoPauloDateKey(now);
  if (reminder.snoozedUntil && reminderDateKey(reminder.snoozedUntil) > today) {
    return "SNOOZED";
  }

  const dueDate = reminderDateKey(reminder.dueDate);
  if (dueDate < today) return "OVERDUE";
  if (dueDate === today) return "TODAY";
  return "UPCOMING";
}

export function daysFromToday(value: Date | string, now = new Date()) {
  const today = parseReminderDate(saoPauloDateKey(now));
  const target = parseReminderDate(reminderDateKey(value));
  if (!today || !target) return 0;
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function saoPauloDayBounds(now = new Date()) {
  const localDate = parseReminderDate(saoPauloDateKey(now));
  if (!localDate) throw new Error("Não foi possível calcular a data de São Paulo.");

  // São Paulo adota UTC-3 sem horário de verão desde 2019.
  localDate.setUTCHours(3, 0, 0, 0);
  return {
    start: localDate,
    end: new Date(localDate.getTime() + 86_400_000 - 1),
  };
}
