import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/lib/auth";
import {
  LayoutDashboard,
  CreditCard,
  Tags,
  Target,
  LineChart,
  MessageSquare,
  Settings,
  LogOut,
  CalendarDays,
  Shield
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import ExpiredPaywall from "@/components/expired-paywall";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { createdAt: true, subscription: true }
  });

  if (!dbUser) {
    redirect("/login");
  }

  const subStatus = getUserSubscriptionStatus(dbUser.createdAt, dbUser.subscription);
  const isExpired = !hasProAccess(subStatus) && session.user.role !== "ADMIN";

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header flex items-center gap-2 mb-8">
          <Image src="/logo-icon.png" alt="Pila Icon" width={32} height={32} />
          <Image src="/logo-text.png" alt="Pila" width={60} height={24} />
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          <Link href="/dashboard" className="nav-item">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/dashboard/transactions" className="nav-item">
            <CreditCard className="w-5 h-5" />
            <span>Transações</span>
          </Link>
          <Link href="/dashboard/recurring" className="nav-item">
            <CalendarDays className="w-5 h-5" />
            <span>Contas Fixas</span>
          </Link>
          <Link href="/dashboard/categories" className="nav-item">
            <Tags className="w-5 h-5" />
            <span>Categorias</span>
          </Link>
          <Link href="/dashboard/budgets" className="nav-item">
            <Target className="w-5 h-5" />
            <span>Orçamentos</span>
          </Link>
          <Link href="/dashboard/reports" className="nav-item">
            <LineChart className="w-5 h-5" />
            <span>Relatórios</span>
          </Link>
          <Link href="/dashboard/whatsapp" className="nav-item">
            <MessageSquare className="w-5 h-5" />
            <span>WhatsApp</span>
          </Link>
          <Link href="/dashboard/settings" className="nav-item">
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </Link>
          {session.user.role === "ADMIN" && (
            <Link href="/admin" className="nav-item" style={{ marginTop: 'auto', color: 'var(--primary)' }}>
              <Shield className="w-5 h-5" />
              <span>Admin Panel</span>
            </Link>
          )}
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
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span className="sr-only">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        {isExpired ? <ExpiredPaywall /> : children}
      </main>
    </div>
  );
}
