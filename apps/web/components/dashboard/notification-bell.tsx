"use client";

import {
  setBillReminderPaid,
  snoozeBillReminder,
} from "@/app/actions/reminders";
import {
  getReminderStatus,
  parseReminderDate,
  reminderDateKey,
  saoPauloDateKey,
} from "@/lib/reminders";
import type { ReminderItem } from "@/components/reminders/types";
import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  ExternalLink,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const STATUS_LABELS = {
  OVERDUE: "Vencido",
  TODAY: "Vence hoje",
  SNOOZED: "Adiado",
  UPCOMING: "Próximo",
  PAID: "Pago",
} as const;

function tomorrowDateKey() {
  const date = parseReminderDate(saoPauloDateKey());
  if (!date) return saoPauloDateKey();
  date.setUTCDate(date.getUTCDate() + 1);
  return reminderDateKey(date);
}

export function NotificationBell({
  reminders,
  pendingCount,
}: {
  reminders: ReminderItem[];
  pendingCount: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function runAction(
    actionKey: string,
    action: () => Promise<{ error?: string; success?: boolean }>,
  ) {
    setError("");
    setPendingAction(actionKey);
    try {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Não foi possível atualizar o lembrete.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
        aria-label={`${pendingCount} lembrete(s) pendente(s)`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold leading-5 text-white">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Lembretes financeiros"
          className="fixed inset-x-3 top-16 z-[120] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-2xl md:absolute md:inset-x-auto md:right-0 md:top-12 md:w-[390px]"
        >
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                Agenda financeira
              </span>
              <h2 className="mt-1 text-lg font-bold text-white">Lembretes</h2>
              <p className="text-xs text-slate-500">
                {pendingCount === 0
                  ? "Nenhum compromisso pendente"
                  : `${pendingCount} compromisso(s) em aberto`}
              </p>
            </div>
            <Link
              href="/dashboard/reminders?new=1"
              onClick={() => setOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
              title="Novo lembrete"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Novo lembrete</span>
            </Link>
          </header>

          {error && (
            <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {reminders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
              <CalendarClock className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Tudo em dia por aqui.</p>
              <p className="mt-1 text-xs text-slate-600">
                Novos vencimentos aparecerão neste painel.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reminders.map((reminder) => {
                const status = getReminderStatus(reminder);
                const effectiveDate = reminder.snoozedUntil || reminder.dueDate;
                const isUrgent = status === "OVERDUE" || status === "TODAY";

                return (
                  <article
                    key={reminder.id}
                    className="rounded-xl border border-white/5 bg-white/[0.025] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {reminder.description}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isUrgent
                                ? "bg-rose-400/10 text-rose-300"
                                : "bg-indigo-400/10 text-indigo-300"
                            }`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-white">
                          {formatCurrency(reminder.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(effectiveDate)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(`paid-${reminder.id}`, () =>
                            setBillReminderPaid(reminder.id, true),
                          )
                        }
                        disabled={pendingAction !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {pendingAction === `paid-${reminder.id}` ? "Salvando..." : "Marcar pago"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runAction(`snooze-${reminder.id}`, () =>
                            snoozeBillReminder(reminder.id, tomorrowDateKey()),
                          )
                        }
                        disabled={pendingAction !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        {pendingAction === `snooze-${reminder.id}` ? "Adiando..." : "Amanhã"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <footer className="mt-4 grid grid-cols-2 gap-2 border-t border-white/5 pt-4">
            <Link
              href="/dashboard/agenda"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:bg-white/5"
            >
              Abrir agenda
            </Link>
            <Link
              href="/dashboard/reminders"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-[#04120d] hover:bg-emerald-300"
            >
              Ver todos
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
