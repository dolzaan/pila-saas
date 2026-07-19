"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  Landmark,
  LayoutDashboard,
  LineChart,
  LoaderCircle,
  MessageSquare,
  RefreshCcw,
  Settings,
  Shield,
  ShieldCheck,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";

interface DashboardNavProps {
  isAdmin: boolean;
}

export interface NavigationItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  pushToBottom?: boolean;
}

interface NavigationLinkProps extends NavigationItemProps {
  isActive: boolean;
}

export const dashboardNavigationItems: NavigationItemProps[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transações", icon: CreditCard },
  { href: "/dashboard/accounts", label: "Contas e cartões", icon: Landmark },
  { href: "/dashboard/reconciliation", label: "Conciliação", icon: RefreshCcw },
  { href: "/dashboard/recurring", label: "Contas Fixas", icon: CalendarDays },
  { href: "/dashboard/reminders", label: "Lembretes", icon: BellRing },
  { href: "/dashboard/planning", label: "Planejamento", icon: ChartNoAxesCombined },
  { href: "/dashboard/categories", label: "Categorias", icon: Tags },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Target },
  { href: "/dashboard/reports", label: "Relatórios", icon: LineChart },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/dashboard/security", label: "Segurança", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

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
  pushToBottom = false,
  isActive,
}: NavigationLinkProps) {
  return (
    <Link
      href={href}
      className={`nav-item ${pushToBottom ? "mt-auto text-emerald-400" : ""}`}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <PendingIndicator />
    </Link>
  );
}

export function DashboardNav({ isAdmin }: DashboardNavProps) {
  const pathname = usePathname();
  const isActiveRoute = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="sidebar-nav" aria-label="Menu principal">
      {dashboardNavigationItems.map((item) => (
        <NavigationItem
          key={item.href}
          {...item}
          isActive={isActiveRoute(item.href)}
        />
      ))}
      {isAdmin && (
        <NavigationItem
          href="/admin"
          label="Admin Panel"
          icon={Shield}
          pushToBottom
          isActive={isActiveRoute("/admin")}
        />
      )}
    </nav>
  );
}
