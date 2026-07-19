"use client";

import {
  deleteBillReminder,
  setBillReminderPaid,
  snoozeBillReminder,
} from "@/app/actions/reminders";
import {
  daysFromToday,
  parseReminderDate,
  reminderDateKey,
  saoPauloDateKey,
  type ReminderStatus,
} from "@/lib/reminders";
import {
  BellRing,
  CalendarClock,
  Check,
  Clock3,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ReminderForm } from "./reminder-form";
import type { ReminderItem } from "./types";

const STATUS_STYLES: Record<ReminderStatus, { label: string; className: string }> = {
  PAID: { label: "Pago", className: "bg-emerald-400/10 text-emerald-300" },
  SNOOZED: { label: "Adiado", className: "bg-indigo-400/10 text-indigo-300" },
  OVERDUE: { label: "Vencido", className: "bg-red-400/10 text-red-300" },
  TODAY: { label: "Vence hoje", className: "bg-amber-400/10 text-amber-300" },
  UPCOMING: { label: "Próximo", className: "bg-white/5 text-gray-300" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDueDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });

const formatInstant = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

function futureDateKey(days: number) {
  const today = parseReminderDate(saoPauloDateKey());
  if (!today) return saoPauloDateKey();
  today.setUTCDate(today.getUTCDate() + days);
  return reminderDateKey(today);
}

export function ReminderCard({
  reminder,
  status,
}: {
  reminder: ReminderItem;
  status: ReminderStatus;
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showSnooze, setShowSnooze] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState(() => futureDateKey(1));
  const [error, setError] = useState("");
  const statusStyle = STATUS_STYLES[status];
  const effectiveDate = reminder.snoozedUntil || reminder.dueDate;
  const days = daysFromToday(effectiveDate);

  async function runAction(
    actionName: string,
    action: () => Promise<{ error?: string; success?: boolean }>,
  ) {
    setError("");
    setPendingAction(actionName);
    try {
      const result = await action();
      if (result.error) setError(result.error);
    } catch {
      setError("Não foi possível concluir a ação.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir o lembrete “${reminder.description}”?`)) return;
    await runAction("delete", () => deleteBillReminder(reminder.id));
  }

  return (
    <article className={`section-card relative overflow-hidden ${status === "PAID" ? "opacity-70" : ""}`}>
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          status === "OVERDUE"
            ? "bg-red-400"
            : status === "TODAY"
              ? "bg-amber-400"
              : status === "PAID"
                ? "bg-emerald-400"
                : "bg-indigo-400"
        }`}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`truncate font-semibold ${status === "PAID" ? "text-gray-400 line-through" : "text-gray-100"}`}>
              {reminder.description}
            </h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle.className}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${status === "OVERDUE" ? "text-red-300" : "text-white"}`}>
            {formatCurrency(reminder.amount)}
          </p>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-start">
          <ReminderForm reminderToEdit={reminder} />
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={pendingAction === "delete"}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            title="Excluir lembrete"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Excluir lembrete</span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-gray-400 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-gray-600" />
          Vencimento: {formatDueDate(reminder.dueDate)}
        </div>
        {reminder.snoozedUntil ? (
          <div className="flex items-center gap-2 text-indigo-300">
            <Clock3 className="h-4 w-4" />
            Adiado para {formatDueDate(reminder.snoozedUntil)}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-gray-600" />
            {status === "PAID"
              ? reminder.paidAt
                ? `Pago em ${formatInstant(reminder.paidAt)}`
                : "Pagamento confirmado"
              : days === 0
                ? "É hoje"
                : days > 0
                  ? `Faltam ${days} dia(s)`
                  : `${Math.abs(days)} dia(s) em atraso`}
          </div>
        )}
      </div>

      {reminder.notificationCount > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-600">
          <BellRing className="h-3.5 w-3.5" />
          {reminder.notificationCount} aviso(s) enviado(s) pelo WhatsApp
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-gray-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
        {status === "PAID" ? (
          <button
            type="button"
            onClick={() =>
              void runAction("unpaid", () => setBillReminderPaid(reminder.id, false))
            }
            disabled={pendingAction === "unpaid"}
            className="app-button app-button--secondary app-button--compact"
          >
            <RotateCcw className="h-4 w-4" />
            Marcar como pendente
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              void runAction("paid", () => setBillReminderPaid(reminder.id, true))
            }
            disabled={pendingAction === "paid"}
            className="app-button app-button--primary app-button--compact"
          >
            <Check className="h-4 w-4" />
            Marcar como pago
          </button>
        )}

        {status !== "PAID" && (
          <button
            type="button"
            onClick={() => setShowSnooze((visible) => !visible)}
            className="app-button app-button--secondary app-button--compact"
            aria-expanded={showSnooze}
          >
            <Clock3 className="h-4 w-4" />
            Lembrar depois
          </button>
        )}
      </div>

      {showSnooze && status !== "PAID" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-indigo-400/15 bg-indigo-400/5 p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor={`snooze-${reminder.id}`} className="text-xs font-medium text-gray-400">
              Nova data do aviso
            </label>
            <input
              id={`snooze-${reminder.id}`}
              type="date"
              min={futureDateKey(1)}
              value={snoozeDate}
              onChange={(event) => setSnoozeDate(event.target.value)}
              className="form-input [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 7].map((daysToAdd) => (
              <button
                key={daysToAdd}
                type="button"
                onClick={() => setSnoozeDate(futureDateKey(daysToAdd))}
                className="rounded-lg border border-white/10 px-2.5 py-2 text-xs text-gray-300 hover:border-indigo-400/40"
              >
                +{daysToAdd}d
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                void runAction("snooze", () =>
                  snoozeBillReminder(reminder.id, snoozeDate),
                )
              }
              disabled={pendingAction === "snooze"}
              className="app-button app-button--secondary app-button--compact"
            >
              Adiar
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
