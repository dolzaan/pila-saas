"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Shield,
  Tags,
  Target,
  X,
} from "lucide-react";

type DashboardNavigationProps = {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    isAdmin: boolean;
  };
};

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Transações", icon: CreditCard },
  { href: "/dashboard/recurring", label: "Contas Fixas", icon: CalendarDays },
  { href: "/dashboard/categories", label: "Categorias", icon: Tags },
  { href: "/dashboard/budgets", label: "Orçamentos", icon: Target },
  { href: "/dashboard/reports", label: "Relatórios", icon: LineChart },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
];

function isCurrentRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNavigation({ user }: DashboardNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return;
      }

      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusableElements = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  const displayName = user.name || "Usuário";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <a className="skip-link" href="#dashboard-content">
        Pular para o conteúdo
      </a>

      <header className="mobile-header">
        <Link href="/dashboard" className="mobile-brand" aria-label="Pila — dashboard">
          <Image src="/logo-icon.png" alt="" width={32} height={32} aria-hidden="true" />
          <Image src="/logo-text.png" alt="Pila" width={60} height={24} />
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          className="mobile-menu-button"
          aria-label="Abrir menu principal"
          aria-controls="dashboard-sidebar"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(true)}
        >
          <Menu aria-hidden="true" />
        </button>
      </header>

      {isOpen && (
        <button
          type="button"
          className="mobile-nav-overlay"
          aria-label="Fechar menu principal"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        ref={sidebarRef}
        id="dashboard-sidebar"
        className={`sidebar ${isOpen ? "sidebar--open" : ""}`}
        aria-label="Navegação do dashboard"
      >
        <Link
          href="/dashboard"
          className="sidebar-header"
          aria-label="Ir para o dashboard"
          title="Voltar ao dashboard"
        >
          <Image src="/logo-icon.png" alt="" width={32} height={32} aria-hidden="true" />
          <Image src="/logo-text.png" alt="Pila" width={60} height={24} />
        </Link>

        <button
          ref={closeButtonRef}
          type="button"
          className="sidebar-close"
          aria-label="Fechar menu principal"
          onClick={() => setIsOpen(false)}
        >
          <X aria-hidden="true" />
        </button>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {navigationItems.map(({ href, label, icon: Icon }) => {
            const isCurrent = isCurrentRoute(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                className="nav-item"
                aria-current={isCurrent ? "page" : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}

          {user.isAdmin && (
            <Link
              href="/admin"
              className="nav-item nav-item--admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            >
              <Shield className="w-5 h-5" aria-hidden="true" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              {initial}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-email">{user.email}</span>
            </div>
          </div>
          <button
            id="btn-signout"
            type="button"
            className="btn-signout"
            title="Sair"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}
