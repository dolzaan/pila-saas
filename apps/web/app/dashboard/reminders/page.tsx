import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReminderStatus } from "@/lib/reminders";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  WalletCards,
} from "lucide-react";
import { ReminderCenter } from "@/components/reminders/reminder-center";
import { ReminderForm } from "@/components/reminders/reminder-form";

export const metadata: Metadata = {
  title: "Central de lembretes — Pila",
  description: "Organize contas a pagar e receba avisos pelo WhatsApp.",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const query = await searchParams;

  const [reminders, user] = await Promise.all([
    prisma.billReminder.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isPaid: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { whatsappNumber: true, whatsappVerifiedAt: true },
    }),
  ]);
  if (!user) redirect("/login");

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
  const statuses = serializedReminders.map((reminder) => getReminderStatus(reminder));
  const pending = serializedReminders.filter((reminder) => !reminder.isPaid);
  const pendingTotal = pending.reduce((sum, reminder) => sum + reminder.amount, 0);
  const overdueCount = statuses.filter((status) => status === "OVERDUE").length;
  const todayCount = statuses.filter((status) => status === "TODAY").length;
  const paidCount = statuses.filter((status) => status === "PAID").length;
  const whatsappConnected = Boolean(user.whatsappNumber && user.whatsappVerifiedAt);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="dashboard-greeting">Central de lembretes</h1>
          <p className="dashboard-subtitle">
            Controle vencimentos e receba avisos antes de esquecer uma conta.
          </p>
        </div>
        <ReminderForm openOnMount={query.new === "1"} />
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Total pendente</span>
            <WalletCards className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(pendingTotal)}</div>
          <div className="stat-footer">{pending.length} compromisso(s) em aberto</div>
        </div>
        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Vencidos</span>
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="stat-value text-red-300">{overdueCount}</div>
          <div className="stat-footer">Precisam de atenção</div>
        </div>
        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Vencem hoje</span>
            <CalendarCheck2 className="h-6 w-6 text-amber-300" />
          </div>
          <div className="stat-value">{todayCount}</div>
          <div className="stat-footer">Aviso diário às 9h</div>
        </div>
        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Pagos</span>
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-300">{paidCount}</div>
          <div className="stat-footer">Histórico confirmado</div>
        </div>
      </div>

      <section
        className={`section-card mb-8 ${
          whatsappConnected
            ? "border-emerald-400/20 bg-emerald-400/5"
            : "border-amber-400/20 bg-amber-400/5"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${whatsappConnected ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-100">
                {whatsappConnected ? "Avisos pelo WhatsApp ativos" : "Conecte o WhatsApp para receber avisos"}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {whatsappConnected
                  ? "O Pila verifica diariamente contas vencendo, vencidas ou adiadas."
                  : "Os lembretes ficam salvos no painel, mas o envio depende de um número verificado."}
              </p>
            </div>
          </div>
          {!whatsappConnected && (
            <Link href="/dashboard/whatsapp" className="app-button app-button--secondary">
              Conectar WhatsApp
            </Link>
          )}
        </div>
      </section>

      <ReminderCenter reminders={serializedReminders} />
    </div>
  );
}
