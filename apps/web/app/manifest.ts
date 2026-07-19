import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "Pila — Finanças pessoais",
    short_name: "Pila",
    description:
      "Controle receitas, despesas, contas e lembretes pelo painel ou WhatsApp.",
    lang: "pt-BR",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0B0F19",
    theme_color: "#0B0F19",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nova transação",
        short_name: "Transação",
        description: "Registrar uma receita ou despesa",
        url: "/dashboard/transactions?new=1",
        icons: [{ src: "/pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
      {
        name: "Novo lembrete",
        short_name: "Lembrete",
        description: "Agendar uma conta a pagar",
        url: "/dashboard/reminders?new=1",
        icons: [{ src: "/pwa-icon.svg", sizes: "192x192", type: "image/svg+xml" }],
      },
    ],
  };
}
