import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurações — FinZap",
};

export default function SettingsPage() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Configurações</h1>
          <p className="dashboard-subtitle">Perfil, WhatsApp e assinatura.</p>
        </div>
      </div>
      <div className="section-card">
        <div className="empty-state">
          <span className="empty-state-icon">🚧</span>
          <p>Em construção — Fases 3–6</p>
          <p className="empty-state-hint">
            Configurações de WhatsApp, perfil e assinatura chegam nas próximas fases.
          </p>
        </div>
      </div>
    </div>
  );
}
