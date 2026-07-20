import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReminderStatus } from "@/lib/reminders";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Repeat2,
  WalletCards,
} from "lucide-react";
import { ReminderForm } from "@/components/reminders/reminder-form";
import { RecurringForm } from "@/components/recurring/recurring-form";

export const metadata: Metadata = {
  title: "Agenda financeira — Pila",
  description: "Acompanhe contas fixas, lembretes e próximos vencimentos.",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const REMINDER_STATUS = {
  OVERDUE: {
    label: "Vencido",
    className: "bg-rose-400/10 text-rose-300",
  },
  TODAY: {
    label: "Vence hoje",
    className: "bg-amber-400/10 text-amber-300",
  },
  SNOOZED: {
    label: "Adiado",
    className: "bg-indigo-400/10 text-indigo-300",
  },
  UPCOMING: {
    label: "Próximo",
    className: "bg-white/5 text-slate-300",
  },
  PAID: {
    label: "Pago",
    className: "bg-emerald-400/10 text-emerald-300",
  },
} as const;

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [reminders, recurringTransactions, categories] = await Promise.all([
    prisma.billReminder.findMany({
      where: { userId: session.user.id, isPaid: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.recurringTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: [{ nextDate: "asc" }, { createdAt: "desc" }],
      include: { category: true },
      take: 6,
    }),
    prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId: session.user.id }],
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedReminders = reminders.map((reminder) => ({
    id: reminder.id,
    description: reminder.description,
    amount: reminder.amount.toNumber(),
    dueDate: reminder.dueDate.toISOString(),
    isPaid: reminder.isPaid,
    paidAt: reminder.paidAt?.toISOString() || null,
    snoozedUntil: reminder.snoozedUntil?.toISOString() || null,
    lastNotifiedAt: reminder.lastNotifiedAt?.toISOString() || null,
    notificationCount: reminder.notificationCount,
  }));
  const reminderItems = serializedReminders.map((reminder) => ({
    reminder,
    status: getReminderStatus(reminder),
  }));
  const overdueCount = reminderItems.filter(
    ({ status }) => status === "OVERDUE",
  ).length;
  const todayCount = reminderItems.filter(({ status }) => status === "TODAY").length;
  const reminderTotal = serializedReminders.reduce(
    (total, reminder) => total + reminder.amount,
    0,
  );
  const recurringExpenseTotal = recurringTransactions
    .filter((transaction) => transaction.kind === "EXPENSE")
    .reduce((total, transaction) => total + transaction.amount.toNumber(), 0);
  const serializedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    icon: category.icon,
    kind: category.kind,
  }));

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="dashboard-kicker text-emerald-400">Organização</span>
          <h1 className="dashboard-greeting">Agenda financeira</h1>
          <p className="dashboard-subtitle">
            Contas fixas, lembretes e vencimentos importantes em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReminderForm />
          <RecurringForm categories={serializedCategories} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="section-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Pendências</p>
              <p className="mt-2 text-2xl font-bold text-white">
                {serializedReminders.length}
              </p>
            </div>
            <WalletCards className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="mt-3 text-xs text-slate-600">
            {formatCurrency(reminderTotal)} em lembretes abertos
          </p>
        </article>

        <article className="section-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Vencidos</p>
              <p className="mt-2 text-2xl font-bold text-rose-300">{overdueCount}</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-rose-300" />
          </div>
          <p className="mt-3 text-xs text-slate-600">Precisam de atenção</p>
        </article>

        <article className="section-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Vencem hoje</p>
              <p className="mt-2 text-2xl font-bold text-amber-300">{todayCount}</p>
            </div>
            <CalendarCheck2 className="h-5 w-5 text-amber-300" />
          </div>
          <p className="mt-3 text-xs text-slate-600">Avisos prioritários</p>
        </article>

        <article className="section-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Contas fixas</p>
              <p className="mt-2 text-2xl font-bold text-indigo-300">
                {recurringTransactions.length}
              </p>
            </div>
            <Repeat2 className="h-5 w-5 text-indigo-300" />
          </div>
          <p className="mt-3 text-xs text-slate-600">
            {formatCurrency(recurringExpenseTotal)} previstos por ciclo
          </p>
        </article>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="section-card">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-400/10 p-2.5 text-emerald-300">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">Próximos lembretes</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Compromissos avulsos e contas a pagar.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/reminders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          {reminderItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-400/50" />
              <p className="text-sm font-medium text-slate-300">Nenhum lembrete pendente.</p>
              <p className="mt-1 text-xs text-slate-600">
                Use o botão acima para adicionar um vencimento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {reminderItems.map(({ reminder, status }) => {
                const style = REMINDER_STATUS[status];
                const effectiveDate = reminder.snoozedUntil || reminder.dueDate;
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {reminder.description}
                        </p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.className}`}>
                          {style.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {formatDate(effectiveDate)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-white">
                      {formatCurrency(reminder.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section-card">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-indigo-400/10 p-2.5 text-indigo-300">
                <CalendarRange className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-100">Contas fixas</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Pagamentos e receitas que se repetem.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/recurring"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
            >
              Gerenciar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </header>

          {recurringTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
              <Repeat2 className="mx-auto mb-3 h-9 w-9 text-indigo-400/40" />
              <p className="text-sm font-medium text-slate-300">Nenhuma conta fixa cadastrada.</p>
              <p className="mt-1 text-xs text-slate-600">
                Adicione aluguel, internet, salário ou assinaturas.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recurringTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {transaction.description || "Conta recorrente"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock3 className="h-3.5 w-3.5" />
                      Próximo vencimento em {formatDate(transaction.nextDate)}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold ${
                      transaction.kind === "INCOME"
                        ? "text-emerald-300"
                        : "text-white"
                    }`}
                  >
                    {transaction.kind === "INCOME" ? "+" : "-"}
                    {formatCurrency(transaction.amount.toNumber())}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
