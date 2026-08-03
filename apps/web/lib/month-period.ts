const APP_TIME_ZONE = "America/Sao_Paulo";

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type MonthPeriod = {
  key: string;
  year: number;
  monthIndex: number;
  label: string;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  isCurrent: boolean;
  isPast: boolean;
};

function getZonedParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return parts as DateParts;
}

function zonedMidnightToUtc(year: number, monthIndex: number, day: number) {
  const utcGuess = Date.UTC(year, monthIndex, day);
  const zonedGuess = getZonedParts(new Date(utcGuess));
  const offset = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second,
  ) - utcGuess;

  return new Date(utcGuess - offset);
}

export function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, monthIndex: number) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function parseMonthKey(value: string | undefined) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value || "");
  if (!match) return null;

  const year = Number(match[1]);
  if (year < 2000 || year > 2100) return null;

  return { year, monthIndex: Number(match[2]) - 1 };
}

export function resolveMonthPeriod(value?: string, now = new Date()): MonthPeriod {
  const currentParts = getZonedParts(now);
  const current = {
    year: currentParts.year,
    monthIndex: currentParts.month - 1,
  };
  const parsed = parseMonthKey(value);
  const requestedKey = parsed ? monthKey(parsed.year, parsed.monthIndex) : null;
  const currentKey = monthKey(current.year, current.monthIndex);
  const selected = parsed && requestedKey! <= currentKey ? parsed : current;
  const selectedKey = monthKey(selected.year, selected.monthIndex);

  return {
    key: selectedKey,
    year: selected.year,
    monthIndex: selected.monthIndex,
    label: monthLabel(selected.year, selected.monthIndex),
    start: zonedMidnightToUtc(selected.year, selected.monthIndex, 1),
    end: zonedMidnightToUtc(selected.year, selected.monthIndex + 1, 1),
    previousStart: zonedMidnightToUtc(selected.year, selected.monthIndex - 1, 1),
    previousEnd: zonedMidnightToUtc(selected.year, selected.monthIndex, 1),
    isCurrent: selectedKey === currentKey,
    isPast: selectedKey < currentKey,
  };
}

export function shiftMonthKey(key: string, amount: number) {
  const parsed = parseMonthKey(key);
  if (!parsed) throw new Error("Período mensal inválido.");

  const shifted = new Date(Date.UTC(parsed.year, parsed.monthIndex + amount, 1));
  return monthKey(shifted.getUTCFullYear(), shifted.getUTCMonth());
}

export function defaultDateForMonth(period: MonthPeriod, now = new Date()) {
  if (period.isCurrent) {
    const parts = getZonedParts(now);
    return `${period.key}-${String(parts.day).padStart(2, "0")}`;
  }

  const currentDay = getZonedParts(now).day;
  const daysInMonth = new Date(
    Date.UTC(period.year, period.monthIndex + 1, 0),
  ).getUTCDate();

  return `${period.key}-${String(Math.min(currentDay, daysInMonth)).padStart(2, "0")}`;
}
