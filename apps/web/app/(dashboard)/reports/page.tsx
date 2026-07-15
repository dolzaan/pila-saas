import type { Metadata } from "next";

export const metadata: Metadata = { title: "Relatórios — FinZap" };

export default function ReportsPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Relatórios</h1>
          <p className="dashboard-subtitle">Análise financeira mensal e anual.</p>
        </div>
      </div>
      <div className="section-card">
        <div className="empty-state">
          <span className="empty-state-icon">🚧</span>
          <p>Em construção — Fases 2 e 5</p>
        </div>
      </div>
    </div>
  );
}
