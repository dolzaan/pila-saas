"use client";

import { getReminderStatus, type ReminderStatus } from "@/lib/reminders";
import { BellOff } from "lucide-react";
import { useState } from "react";
import { ReminderCard } from "./reminder-card";
import type { ReminderItem } from "./types";

type Filter = "PENDING" | "OVERDUE" | "PAID" | "ALL";

const FILTER_LABELS: Record<Filter, string> = {
  PENDING: "Pendentes",
  OVERDUE: "Vencidos",
  PAID: "Pagos",
  ALL: "Todos",
};

function matchesFilter(status: ReminderStatus, filter: Filter) {
  if (filter === "ALL") return true;
  if (filter === "PAID") return status === "PAID";
  if (filter === "OVERDUE") return status === "OVERDUE";
  return status !== "PAID";
}

export function ReminderCenter({ reminders }: { reminders: ReminderItem[] }) {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const remindersWithStatus = reminders.map((reminder) => ({
    reminder,
    status: getReminderStatus(reminder),
  }));
  const visibleReminders = remindersWithStatus.filter(({ status }) =>
    matchesFilter(status, filter),
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar lembretes">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((item) => {
          const count = remindersWithStatus.filter(({ status }) =>
            matchesFilter(status, item),
          ).length;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              aria-pressed={filter === item}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                filter === item
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-gray-400 hover:text-gray-200"
              }`}
            >
              {FILTER_LABELS[item]} <span className="ml-1 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {visibleReminders.length === 0 ? (
        <div className="section-card empty-state">
          <BellOff className="mb-3 h-10 w-10 text-gray-600" />
          <p>Nenhum lembrete neste filtro.</p>
          <p className="empty-state-hint">
            Crie um lembrete pelo painel ou peça ao Pila pelo WhatsApp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleReminders.map(({ reminder, status }) => (
            <ReminderCard key={reminder.id} reminder={reminder} status={status} />
          ))}
        </div>
      )}
    </div>
  );
}
