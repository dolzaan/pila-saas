"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plus,
  Shield,
  WalletCards,
  X,
} from "lucide-react";
import {
  dashboardNavigationItems,
  type NavigationItemProps,
} from "./dashboard-nav";
import { PwaInstallButton } from "@/components/pwa-install-button";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

interface MobileDashboardNavProps {
  isAdmin: boolean;
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  signOutForm: ReactNode;
  notificationSlot?: ReactNode;
}

type OpenPanel = "actions" | "more" | null;

const primaryRoutes = new Set([
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/agenda",
]);
const focusableElements = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isActiveRoute(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function MobileNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItemProps;
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const isActive = isActiveRoute(pathname, item.href);

  return (
    <Link
      href={item.href}
      className="mobile-nav-link"
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export function MobileDashboardNav({
  isAdmin,
  userName,
  userEmail,
  signOutForm,
  notificationSlot,
}: MobileDashboardNavProps) {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const currentItem = dashboardNavigationItems.find((item) =>
    isActiveRoute(pathname, item.href),
  );
  const moreItems = dashboardNavigationItems.filter(
    (item) => !primaryRoutes.has(item.href),
  );
  const moreIsActive =
    moreItems.some((item) => isActiveRoute(pathname, item.href)) ||
    pathname.startsWith("/admin");

  useEffect(() => {
    if (!openPanel) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
      previousFocus?.focus();
    };
  }, [openPanel]);

  const closePanel = () => setOpenPanel(null);

  function keepFocusInside(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;

    const sheet = event.currentTarget;
    const elements = sheet.querySelectorAll<HTMLElement>(focusableElements);
    if (!elements.length) {
      event.preventDefault();
      return;
    }

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <>
      <header className="mobile-dashboard-header">
        <Link
          href="/dashboard"
          className="mobile-dashboard-brand"
          aria-label="Ir para o dashboard"
        >
          <Image
            src="/logo-icon.png"
            alt=""
            width={30}
            height={26}
            aria-hidden="true"
          />
          <span>Pila</span>
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="mobile-dashboard-title max-w-[9rem] truncate">
            {pathname.startsWith("/admin")
              ? "Admin"
              : currentItem?.label || "Painel"}
          </span>
          {notificationSlot}
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        <MobileNavLink
          item={{
            href: "/dashboard",
            label: "Início",
            icon: LayoutDashboard,
          }}
          pathname={pathname}
        />
        <MobileNavLink
          item={{
            href: "/dashboard/transactions",
            label: "Transações",
            icon: CreditCard,
          }}
          pathname={pathname}
        />
        <button
          type="button"
          className="mobile-nav-action"
          aria-label="Adicionar"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "actions"}
          onClick={() =>
            setOpenPanel((current) =>
              current === "actions" ? null : "actions",
            )
          }
        >
          <span>
            <Plus className="h-6 w-6" aria-hidden="true" />
          </span>
          Adicionar
        </button>
        <MobileNavLink
          item={{
            href: "/dashboard/agenda",
            label: "Agenda",
            icon: CalendarRange,
          }}
          pathname={pathname}
        />
        <button
          type="button"
          className="mobile-nav-link"
          data-active={moreIsActive}
          aria-label="Abrir menu completo"
          aria-haspopup="dialog"
          aria-expanded={openPanel === "more"}
          onClick={() =>
            setOpenPanel((current) => (current === "more" ? null : "more"))
          }
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {openPanel && (
        <div className="mobile-sheet-layer">
          <button
            type="button"
            className="mobile-sheet-backdrop"
            onClick={closePanel}
            aria-label="Fechar menu"
            tabIndex={-1}
          />
          <section
            className="mobile-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`mobile-${openPanel}-title`}
            onKeyDown={keepFocusInside}
          >
            <div className="mobile-sheet-handle" aria-hidden="true" />
            <header className="mobile-sheet-header">
              <div>
                <span className="dashboard-kicker text-emerald-400">
                  {openPanel === "actions" ? "Acesso rápido" : "Navegação"}
                </span>
                <h2 id={`mobile-${openPanel}-title`}>
                  {openPanel === "actions" ? "O que deseja adicionar?" : "Menu do Pila"}
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="mobile-sheet-close"
                onClick={closePanel}
                aria-label="Fechar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            {openPanel === "actions" ? (
              <div className="mobile-quick-actions">
                <Link
                  href="/dashboard/transactions?new=1"
                  className="mobile-quick-action mobile-quick-action--primary"
                  onClick={closePanel}
                >
                  <CreditCard className="h-6 w-6" aria-hidden="true" />
                  <span>
                    <strong>Nova transação</strong>
                    <small>Registrar uma receita ou despesa</small>
                  </span>
                </Link>
                <Link
                  href="/dashboard/reminders?new=1"
                  className="mobile-quick-action"
                  onClick={closePanel}
                >
                  <WalletCards className="h-6 w-6" aria-hidden="true" />
                  <span>
                    <strong>Novo lembrete</strong>
                    <small>Agendar uma conta a pagar</small>
                  </span>
                </Link>
                <Link
                  href="/dashboard/whatsapp"
                  className="mobile-quick-action"
                  onClick={closePanel}
                >
                  <MessageSquare className="h-6 w-6" aria-hidden="true" />
                  <span>
                    <strong>Falar com o Pila</strong>
                    <small>Registrar pelo WhatsApp</small>
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <div className="mobile-more-grid">
                  {moreItems.map((item) => (
                    <MobileNavLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onNavigate={closePanel}
                    />
                  ))}
                  {isAdmin && (
                    <MobileNavLink
                      item={{
                        href: "/admin",
                        label: "Admin Panel",
                        icon: Shield,
                      }}
                      pathname={pathname}
                      onNavigate={closePanel}
                    />
                  )}
                </div>
                <div className="mobile-sheet-account">
                  <div className="mobile-sheet-user">
                    <span className="sidebar-avatar" aria-hidden="true">
                      {userName?.charAt(0).toUpperCase() || "U"}
                    </span>
                    <span>
                      <strong>{userName || "Usuário"}</strong>
                      <small>{userEmail}</small>
                    </span>
                  </div>
                  <PwaInstallButton />
                  {signOutForm}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
