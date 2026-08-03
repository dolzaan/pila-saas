import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { resolveMonthPeriod, shiftMonthKey } from "@/lib/month-period";

type MonthNavigatorProps = {
  pathname: string;
  selectedMonth: string;
  label: string;
  isCurrent: boolean;
  allPeriods?: boolean;
  allowAllPeriods?: boolean;
  queryParams?: Record<string, string | undefined>;
  tone?: "dark" | "mint";
};

export function MonthNavigator({
  pathname,
  selectedMonth,
  label,
  isCurrent,
  allPeriods = false,
  allowAllPeriods = false,
  queryParams = {},
  tone = "dark",
}: MonthNavigatorProps) {
  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value) baseParams.set(key, value);
  }

  const hrefForMonth = (month?: string) => {
    const params = new URLSearchParams(baseParams);
    params.delete("period");
    if (month) params.set("month", month);
    else params.delete("month");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const allPeriodsHref = (() => {
    const params = new URLSearchParams(baseParams);
    params.delete("month");
    params.set("period", "all");
    return `${pathname}?${params.toString()}`;
  })();

  const previousMonth = shiftMonthKey(selectedMonth, -1);
  const nextMonth = shiftMonthKey(selectedMonth, 1);
  const currentMonth = resolveMonthPeriod().key;
  const hiddenParams = Array.from(baseParams.entries());

  return (
    <div
      className={`month-navigator month-navigator--${tone}`}
      aria-label="Selecionar período financeiro"
    >
      <div className="month-navigator__controls">
        {allPeriods ? (
          <span
            className="month-navigator__arrow month-navigator__arrow--disabled"
            aria-hidden="true"
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={hrefForMonth(previousMonth)}
            className="month-navigator__arrow"
            aria-label={`Ver mês anterior a ${label}`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}

        <div className="month-navigator__label" aria-live="polite">
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
          <span>{allPeriods ? "Todos os períodos" : label}</span>
        </div>

        {isCurrent || allPeriods ? (
          <span
            className="month-navigator__arrow month-navigator__arrow--disabled"
            aria-hidden="true"
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={hrefForMonth(nextMonth)}
            className="month-navigator__arrow"
            aria-label={`Ver mês seguinte a ${label}`}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>

      <form action={pathname} className="month-navigator__picker">
        {hiddenParams.map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <label htmlFor={`month-${pathname.replaceAll("/", "-")}`} className="sr-only">
          Escolher mês e ano
        </label>
        <input
          id={`month-${pathname.replaceAll("/", "-")}`}
          name="month"
          type="month"
          max={currentMonth}
          defaultValue={selectedMonth}
          className="month-navigator__input"
        />
        <button type="submit" className="month-navigator__submit">
          Ir
        </button>
      </form>

      <div className="month-navigator__shortcuts">
        {(!isCurrent || allPeriods) && (
          <Link href={hrefForMonth()} className="month-navigator__shortcut">
            Mês atual
          </Link>
        )}
        {allowAllPeriods && !allPeriods && (
          <Link href={allPeriodsHref} className="month-navigator__shortcut">
            Todos os períodos
          </Link>
        )}
      </div>
    </div>
  );
}
