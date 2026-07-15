import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — FinZap",
  description: "Visão geral das suas finanças pessoais.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "Usuário";

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Olá, {firstName}! 👋</h1>
          <p className="dashboard-subtitle">
            Aqui está o resumo das suas finanças.
          </p>
        </div>
        <div className="dashboard-period">
          <span className="period-badge">
            {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="stats-grid">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Saldo do mês</span>
            <span className="stat-icon">💰</span>
          </div>
          <div className="stat-value">R$ 0,00</div>
          <div className="stat-footer">
            Conecte sua conta para ver os dados
          </div>
        </div>

        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Gastos</span>
            <span className="stat-icon">📉</span>
          </div>
          <div className="stat-value">R$ 0,00</div>
          <div className="stat-footer">Este mês</div>
        </div>

        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Receitas</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-value">R$ 0,00</div>
          <div className="stat-footer">Este mês</div>
        </div>

        <div className="stat-card stat-card--transactions">
          <div className="stat-card-header">
            <span className="stat-label">Transações</span>
            <span className="stat-icon">🔄</span>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-footer">Este mês</div>
        </div>
      </div>

      {/* CTA WhatsApp */}
      <div className="whatsapp-cta">
        <div className="whatsapp-cta-icon">📱</div>
        <div className="whatsapp-cta-content">
          <h2 className="whatsapp-cta-title">Conecte seu WhatsApp</h2>
          <p className="whatsapp-cta-desc">
            Registre gastos e receitas enviando mensagens de texto. Ex:{" "}
            <code>gastei 45 no mercado</code> ou <code>recebi 3000 de salário</code>.
          </p>
        </div>
        <a href="/dashboard/settings/whatsapp" className="btn-whatsapp">
          Conectar agora
        </a>
      </div>

      {/* Transações recentes — placeholder Fase 2 */}
      <div className="section-card">
        <h2 className="section-title">Transações recentes</h2>
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <p>Nenhuma transação ainda.</p>
          <p className="empty-state-hint">
            Adicione transações manualmente ou conecte o WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
