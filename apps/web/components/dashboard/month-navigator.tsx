"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingTarget, setPendingTarget] = useState<string | null>(null);
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

  const navigate = (href: string, target: string) => {
    if (isPending) return;
    setPendingTarget(target);
    startTransition(() => router.push(href));
  };

  const handleLinkClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
    target: string,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href, target);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const month = data.get("month");
    if (typeof month !== "string" || !month) return;
    navigate(hrefForMonth(month), "picker");
  };

  const isLoadingTarget = (target: string) => isPending && pendingTarget === target;

  return (
    <div
      className={`month-navigator month-navigator--${tone}${isPending ? " month-navigator--pending" : ""}`}
      aria-label="Selecionar período financeiro"
      aria-busy={isPending}
    >
      {isPending && <span className="month-navigator__progress" aria-hidden="true" />}
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
            aria-disabled={isPending}
            onClick={(event) =>
              handleLinkClick(event, hrefForMonth(previousMonth), "previous")
            }
          >
            {isLoadingTarget("previous") ? (
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            )}
          </Link>
        )}

        <div
          key={allPeriods ? "all" : selectedMonth}
          className="month-navigator__label"
          aria-live="polite"
        >
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
            aria-disabled={isPending}
            onClick={(event) =>
              handleLinkClick(event, hrefForMonth(nextMonth), "next")
            }
          >
            {isLoadingTarget("next") ? (
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            )}
          </Link>
        )}
      </div>

      <form action={pathname} className="month-navigator__picker" onSubmit={handleSubmit}>
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
          disabled={isPending}
        />
        <button type="submit" className="month-navigator__submit" disabled={isPending}>
          {isLoadingTarget("picker") ? (
            <>
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              <span>Atualizando...</span>
            </>
          ) : (
            <>
              <span>Aplicar</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="month-navigator__shortcuts">
        {(!isCurrent || allPeriods) && (
          <Link
            href={hrefForMonth()}
            className="month-navigator__shortcut"
            aria-disabled={isPending}
            onClick={(event) => handleLinkClick(event, hrefForMonth(), "current")}
          >
            {isLoadingTarget("current") && (
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            )}
            Mês atual
          </Link>
        )}
        {allowAllPeriods && !allPeriods && (
          <Link
            href={allPeriodsHref}
            className="month-navigator__shortcut"
            aria-disabled={isPending}
            onClick={(event) => handleLinkClick(event, allPeriodsHref, "all")}
          >
            {isLoadingTarget("all") && (
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            )}
            Todos os períodos
          </Link>
        )}
      </div>

      <span className="sr-only" aria-live="polite">
        {isPending ? "Atualizando dados do período selecionado" : ""}
      </span>
    </div>
  );
}
