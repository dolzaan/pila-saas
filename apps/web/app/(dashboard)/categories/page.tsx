import type { Metadata } from "next";

export const metadata: Metadata = { title: "Categorias — FinZap" };

export default function CategoriesPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Categorias</h1>
          <p className="dashboard-subtitle">Categorias padrão e personalizadas.</p>
        </div>
      </div>
      <div className="section-card">
        <div className="empty-state">
          <span className="empty-state-icon">🚧</span>
          <p>Em construção — Fase 2</p>
        </div>
      </div>
    </div>
  );
}
