import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import ExpiredPaywall from "@/components/expired-paywall";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

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
        <Link
          href="/dashboard"
          className="sidebar-header"
          aria-label="Ir para o dashboard"
          title="Voltar ao dashboard"
        >
          <Image src="/logo-icon.png" alt="" width={32} height={32} aria-hidden="true" />
          <Image src="/logo-text.png" alt="Pila" width={60} height={24} />
        </Link>

        <DashboardNav isAdmin={session.user.role === "ADMIN"} />

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
        {isExpired ? <ExpiredPaywall status={subStatus.status} /> : children}
      </main>
    </div>
  );
}
