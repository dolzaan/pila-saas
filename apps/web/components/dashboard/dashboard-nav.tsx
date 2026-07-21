"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  ChartNoAxesCombined,
  ChevronDown,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LineChart,
  LoaderCircle,
  MessageSquare,
  RefreshCcw,
  Settings,
  Shield,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

interface DashboardNavProps {
  isAdmin: boolean;
  collapsed?: boolean;
}

export interface NavigationItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  collapsible?: boolean;
  items: NavigationItemProps[];
}

interface NavigationLinkProps extends NavigationItemProps {
  isActive: boolean;
  collapsed: boolean;
}

export const dashboardNavigationGroups: NavigationGroup[] = [
  {
    id: "main",
    label: "Principal",
    items: [
      { href: "/painel", label: "Painel", icon: LayoutDashboard },
      { href: "/painel/movimentacoes", label: "Movimentações", icon: CreditCard },
      { href: "/painel/contas", label: "Contas e cartões", icon: Landmark },
    ],
  },
  {
    id: "planning",
    label: "Planejamento",
    items: [
      {
        href: "/painel/agenda",
        label: "Agenda financeira",
        icon: CalendarRange,
        description: "Contas fixas e lembretes",
      },
      { href: "/painel/planejamento", label: "Planejamento", icon: ChartNoAxesCombined },
      { href: "/painel/orcamentos", label: "Orçamentos", icon: Target },
    ],
  },
  {
    id: "analysis",
    label: "Análise",
    items: [
      { href: "/painel/conciliacao", label: "Conciliação", icon: RefreshCcw },
      { href: "/painel/relatorios", label: "Relatórios", icon: LineChart },
    ],
  },
  {
    id: "more",
    label: "Mais",
    collapsible: true,
    items: [
      { href: "/painel/categorias", label: "Categorias", icon: Tags },
      { href: "/painel/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export const dashboardNavigationItems = dashboardNavigationGroups.flatMap(
  (group) => group.items,
);

function PendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      className="nav-pending-indicator"
      data-pending={pending}
      aria-hidden="true"
    >
      <LoaderCircle className="h-4 w-4" />
    </span>
  );
}

function NavigationItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
}: NavigationLinkProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group flex min-h-10 items-center rounded-xl text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${
        isActive
          ? "bg-emerald-400/10 text-emerald-300"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-colors ${
          isActive ? "text-emerald-300" : "text-slate-500 group-hover:text-slate-300"
        }`}
        aria-hidden="true"
      />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && <PendingIndicator />}
    </Link>
  );
}

export function DashboardNav({ isAdmin, collapsed = false }: DashboardNavProps) {
  const pathname = usePathname();
  const isActiveRoute = (href: string) =>
    href === "/painel"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () =>
      new Set(
        dashboardNavigationGroups
          .filter(
            (group) =>
              !group.collapsible || group.items.some((item) => isActiveRoute(item.href)),
          )
          .map((group) => group.id),
      ),
  );

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Menu principal"
    >
      {dashboardNavigationGroups.map((group) => {
        const isOpen = collapsed || openGroups.has(group.id);
        const hasActiveItem = group.items.some((item) => isActiveRoute(item.href));

        return (
          <section key={group.id} aria-label={group.label}>
            {!collapsed && (
              <button
                type="button"
                onClick={() => group.collapsible && toggleGroup(group.id)}
                disabled={!group.collapsible}
                className={`mb-1 flex w-full items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                  hasActiveItem ? "text-emerald-300/80" : "text-slate-600"
                } ${group.collapsible ? "hover:text-slate-400" : "cursor-default"}`}
                aria-expanded={group.collapsible ? isOpen : undefined}
              >
                <span>{group.label}</span>
                {group.collapsible && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                )}
              </button>
            )}

            {isOpen && (
              <div className={`flex flex-col gap-1 ${collapsed ? "border-b border-white/5 pb-3" : ""}`}>
                {group.items.map((item) => (
                  <NavigationItem
                    key={item.href}
                    {...item}
                    collapsed={collapsed}
                    isActive={isActiveRoute(item.href)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {isAdmin && (
        <div className="mt-auto border-t border-white/5 pt-3">
          <NavigationItem
            href="/admin"
            label="Painel administrativo"
            icon={Shield}
            collapsed={collapsed}
            isActive={isActiveRoute("/admin")}
          />
        </div>
      )}
    </nav>
  );
}
