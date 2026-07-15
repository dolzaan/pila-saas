import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transações — FinZap",
  description: "Visualize e gerencie suas transações financeiras.",
};

export default function TransactionsPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Transações</h1>
          <p className="dashboard-subtitle">
            Gerencie seus gastos e receitas.
          </p>
        </div>
      </div>

      <div className="section-card">
        <div className="empty-state">
          <span className="empty-state-icon">🚧</span>
          <p>Em construção — Fase 2</p>
          <p className="empty-state-hint">
            CRUD completo de transações será implementado na Fase 2.
          </p>
        </div>
      </div>
    </div>
  );
}
