import { Headphones } from "lucide-react";
import { getPilaSupportUrl } from "@/lib/support-contact";

export function SupportButton({
  floating = false,
}: {
  floating?: boolean;
}) {
  const supportUrl = getPilaSupportUrl(
    "Olá, Paulo! Preciso de ajuda com minha conta no Pila.",
  );

  return (
    <a
      href={supportUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={
        floating
          ? "fixed bottom-24 left-4 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-emerald-400/25 bg-[#111827]/95 px-4 text-sm font-semibold text-emerald-300 shadow-2xl backdrop-blur-xl transition hover:border-emerald-300/50 hover:bg-emerald-400/10 md:hidden"
          : "inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 text-sm font-semibold text-emerald-300 transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10"
      }
      title="Falar com o suporte humano pelo WhatsApp"
      aria-label="Falar com o suporte humano pelo WhatsApp"
    >
      <Headphones className="h-4 w-4" aria-hidden="true" />
      <span>Suporte</span>
    </a>
  );
}
