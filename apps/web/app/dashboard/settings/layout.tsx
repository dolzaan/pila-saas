import type { ReactNode } from "react";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-kicker text-emerald-400">Sua conta</span>
          <h1 className="dashboard-greeting">Configurações</h1>
          <p className="dashboard-subtitle">
            Perfil, plano, privacidade, segurança e integrações.
          </p>
        </div>
      </div>

      <SettingsNav />
      {children}
    </div>
  );
}
