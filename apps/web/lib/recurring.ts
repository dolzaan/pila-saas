import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import type { RecurrenceInterval } from "@prisma/client";

export function getNextRecurringDate(
  date: Date,
  interval: RecurrenceInterval,
): Date {
  if (interval === "DAILY") return addDays(date, 1);
  if (interval === "WEEKLY") return addWeeks(date, 1);
  if (interval === "YEARLY") return addYears(date, 1);
  return addMonths(date, 1);
}
