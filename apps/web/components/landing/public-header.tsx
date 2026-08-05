"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import styles from "./public-header.module.css";

const NAV_ITEMS = [
  { href: "/features", label: "Recursos" },
  { href: "/how-it-works", label: "Como funciona" },
  { href: "/security", label: "Segurança" },
  { href: "/#preco", label: "Preço", section: "preco" },
] as const;

const ACTIVE_PATHS: Record<string, string[]> = {
  "/features": ["/features", "/recursos"],
  "/how-it-works": ["/how-it-works", "/como-funciona"],
  "/security": ["/security", "/seguranca"],
};

export function PublicHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const section = document.querySelector<HTMLElement>("#preco");
    if (!section || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setActiveSection(entry.isIntersecting ? "preco" : null),
      { rootMargin: "-25% 0px -55% 0px", threshold: 0 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  function isActive(href: string, section?: string) {
    if (section) return pathname === "/" && activeSection === section;
    return (ACTIVE_PATHS[href] ?? [href]).includes(pathname);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="Pila — início">
          <Image src="/logo-icon.png" alt="" width={40} height={40} priority />
          <span>Pila</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, "section" in item ? item.section : undefined);
            return (
              <Link className={active ? styles.active : ""} href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <Link className={styles.login} href="/login">Entrar</Link>
          <Link className={styles.cta} href="/register" data-specular-button>
            <span className={styles.ctaDesktop}>Testar grátis por 7 dias</span>
            <span className={styles.ctaMobile}>7 dias grátis</span>
            <ArrowRight size={16} />
          </Link>
          <button
            ref={menuButtonRef}
            className={styles.menuButton}
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.overlay} ${menuOpen ? styles.overlayVisible : ""}`}
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />
      <aside
        id="public-mobile-menu"
        className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className={styles.drawerHeader}>
          <span>Menu</span>
          <button ref={closeButtonRef} type="button" aria-label="Fechar menu" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Navegação mobile">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, "section" in item ? item.section : undefined);
            return (
              <Link className={active ? styles.active : ""} href={item.href} key={item.href} aria-current={active ? "page" : undefined} onClick={closeMenu}>
                <span>{item.label}</span><ArrowRight size={18} />
              </Link>
            );
          })}
        </nav>
        <div className={styles.drawerActions}>
          <Link href="/login" onClick={closeMenu}>Entrar na minha conta</Link>
          <Link className={styles.drawerCta} href="/register" onClick={closeMenu}>Testar grátis por 7 dias <ArrowRight size={18} /></Link>
          <small>Sem cartão. Você decide no dia 8.</small>
        </div>
      </aside>
    </header>
  );
}
