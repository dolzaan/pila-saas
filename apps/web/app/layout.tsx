import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinZap — Finanças Pessoais pelo WhatsApp",
    template: "%s — FinZap",
  },
  description:
    "Controle suas finanças pessoais registrando gastos e receitas diretamente pelo WhatsApp. Dashboard completo com relatórios, orçamentos e muito mais.",
  keywords: ["finanças pessoais", "controle financeiro", "WhatsApp", "orçamento", "gastos"],
  authors: [{ name: "FinZap" }],
  openGraph: {
    title: "FinZap — Finanças Pessoais pelo WhatsApp",
    description: "Controle suas finanças pessoais registrando gastos pelo WhatsApp.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body>{children}</body>
    </html>
  );
}
