"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Search,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { ReminderItem } from "@/components/reminders/types";
import {
  DashboardNav,
  dashboardNavigationItems,
} from "@/components/dashboard/dashboard-nav";
import { MobileDashboardNav } from "@/components/dashboard/mobile-dashboard-nav";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ProductOnboarding } from "@/components/dashboard/product-onboarding";
import { SupportButton } from "@/components/dashboard/support-button";

interface DashboardShellProps {
  children: ReactNode;
  isAdmin: boolean;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  signOutForm: ReactNode;
  reminders: ReminderItem[];
  pendingReminderCount: number;
  onboarding: {
    initialStep: number;
    shouldAutoOpen: boolean;
    isFirstRun: boolean;
    hasTransaction: boolean;
    hasFinancialAccount: boolean;
    whatsappLinked: boolean;
  };
}

function isActiveRoute(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  isAdmin,
  userName,
  userEmail,
  signOutForm,
  reminders,
  pendingReminderCount,
  onboarding,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentItem = dashboardNavigationItems.find((item) =>
    isActiveRoute(pathname, item.href),
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (!query) return [];
    return dashboardNavigationItems
      .filter((item) =>
        `${item.label} ${item.description || ""}`
          .toLocaleLowerCase("pt-BR")
          .includes(query),
      )
      .slice(0, 6);
  }, [searchQuery]);

  function navigateFromSearch(href: string) {
    setSearchQuery("");
    router.push(href);
  }

  const notificationBell = (
    <NotificationBell
      reminders={reminders}
      pendingCount={pendingReminderCount}
    />
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-white/10 bg-[#111827] px-3 py-4 transition-[width] duration-200 md:flex ${
          collapsed ? "w-[76px]" : "w-[248px]"
        }`}
      >
        <div
          className={`mb-5 flex h-12 items-center ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-emerald-400/5"
            aria-label="Ir para o dashboard"
            title="Voltar ao dashboard"
          >
            <Image
              src="/logo-icon.png"
              alt=""
              width={32}
              height={32}
              aria-hidden="true"
              className="shrink-0"
            />
            {!collapsed && (
              <Image src="/logo-text.png" alt="Pila" width={60} height={24} />
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-white/5 hover:text-slate-200"
              aria-label="Recolher menu lateral"
              title="Recolher menu"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mb-4 grid h-9 w-full place-items-center rounded-xl border border-white/5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
            aria-label="Expandir menu lateral"
            title="Expandir menu"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <DashboardNav isAdmin={isAdmin} collapsed={collapsed} />

        <div className="mt-4 border-t border-white/10 pt-3">
          <div
            className={`flex items-center ${
              collapsed ? "flex-col gap-2" : "gap-2"
            }`}
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-indigo-500 text-sm font-bold text-white"
              title={userEmail || undefined}
            >
              {userName?.charAt(0).toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {userName || "Usuário"}
                </p>
                <Link
                  href="/dashboard/settings"
                  className="text-xs text-slate-500 hover:text-emerald-300"
                >
                  Gerenciar conta
                </Link>
              </div>
            )}
            <div className={collapsed ? "[&_button]:h-9 [&_button]:w-9" : ""}>
              {signOutForm}
            </div>
          </div>
        </div>
      </aside>

      <MobileDashboardNav
        isAdmin={isAdmin}
        userName={userName}
        userEmail={userEmail}
        signOutForm={signOutForm}
        notificationSlot={notificationBell}
      />

      <div
        className={`min-h-screen transition-[margin] duration-200 md:pb-0 ${
          collapsed ? "md:ml-[76px]" : "md:ml-[248px]"
        }`}
      >
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-between gap-4 border-b border-white/5 bg-[#0b0f19]/85 px-6 backdrop-blur-xl md:flex">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
              Área autenticada
            </p>
            <p className="truncate text-sm font-semibold text-slate-200">
              {pathname.startsWith("/admin")
                ? "Admin"
                : currentItem?.label || "Pila"}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar no Pila..."
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-400/30 focus:bg-emerald-400/[0.04]"
              aria-label="Buscar páginas do Pila"
            />
            {searchQuery.trim() && (
              <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-slate-500">
                    Nenhuma página encontrada.
                  </p>
                ) : (
                  searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => navigateFromSearch(item.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <Icon className="h-4 w-4 text-slate-500" />
                        <span>
                          <strong className="block font-medium">{item.label}</strong>
                          {item.description && (
                            <small className="text-xs text-slate-600">
                              {item.description}
                            </small>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SupportButton />
            <Link
              href="/dashboard?guide=1"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
              title="Abrir guia do Pila"
            >
              <CircleHelp className="h-5 w-5" />
              <span className="sr-only">Abrir guia do Pila</span>
            </Link>
            {notificationBell}
            <Link
              href="/dashboard/settings"
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300"
              title="Configurações"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Configurações</span>
            </Link>
          </div>
        </header>

        <main className="min-h-screen px-4 pb-28 pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-6 md:px-8 md:pb-8 md:pt-7">
          {children}
        </main>
      </div>

      <SupportButton floating />
      <ProductOnboarding
        userName={userName}
        initialStep={onboarding.initialStep}
        shouldAutoOpen={onboarding.shouldAutoOpen}
        isFirstRun={onboarding.isFirstRun}
        hasTransaction={onboarding.hasTransaction}
        hasFinancialAccount={onboarding.hasFinancialAccount}
        whatsappLinked={onboarding.whatsappLinked}
      />
    </div>
  );
}
