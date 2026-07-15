import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orçamentos — FinZap" };

export default function BudgetsPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Orçamentos</h1>
          <p className="dashboard-subtitle">Limites mensais por categoria.</p>
        </div>
      </div>
      <div className="section-card">
        <div className="empty-state">
          <span className="empty-state-icon">🚧</span>
          <p>Em construção — Fase 5</p>
        </div>
      </div>
    </div>
  );
}
