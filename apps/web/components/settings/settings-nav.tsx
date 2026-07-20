"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Link2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";

const items = [
  {
    href: "/dashboard/settings#profile",
    label: "Perfil",
    icon: UserRound,
    activePath: "/dashboard/settings",
  },
  {
    href: "/dashboard/settings#subscription",
    label: "Assinatura",
    icon: CreditCard,
    activePath: "/dashboard/settings",
  },
  {
    href: "/dashboard/settings#privacy",
    label: "Privacidade",
    icon: LockKeyhole,
    activePath: "/dashboard/settings",
  },
  {
    href: "/dashboard/settings/security",
    label: "Segurança",
    icon: ShieldCheck,
    activePath: "/dashboard/settings/security",
  },
  {
    href: "/dashboard/whatsapp",
    label: "Integrações",
    icon: Link2,
    activePath: "/dashboard/whatsapp",
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções de configurações"
      className="mb-8 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isSecurity = item.activePath === "/dashboard/settings/security";
        const isActive = isSecurity
          ? pathname.startsWith(item.activePath)
          : pathname === item.activePath;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-emerald-400/10 text-emerald-300"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
