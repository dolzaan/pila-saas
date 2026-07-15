import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo-icon">💸</span>
          <span className="sidebar-logo-text">FinZap</span>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          <Link href="/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/transactions" className="nav-item">
            <span className="nav-icon">💳</span>
            <span>Transações</span>
          </Link>
          <Link href="/dashboard/categories" className="nav-item">
            <span className="nav-icon">🏷️</span>
            <span>Categorias</span>
          </Link>
          <Link href="/dashboard/budgets" className="nav-item">
            <span className="nav-icon">🎯</span>
            <span>Orçamentos</span>
          </Link>
          <Link href="/dashboard/reports" className="nav-item">
            <span className="nav-icon">📈</span>
            <span>Relatórios</span>
          </Link>
          <Link href="/dashboard/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span>Configurações</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {session.user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{session.user.name}</span>
              <span className="sidebar-user-email">{session.user.email}</span>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              id="btn-signout"
              type="submit"
              className="btn-signout"
              title="Sair"
            >
              <span aria-hidden="true">→</span>
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
