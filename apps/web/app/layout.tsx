import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pila — Finanças Pessoais pelo WhatsApp",
    template: "%s — Pila",
  },
  description:
    "Controle suas finanças pessoais registrando gastos e receitas diretamente pelo WhatsApp. Dashboard completo com relatórios, orçamentos e muito mais.",
  keywords: ["finanças pessoais", "controle financeiro", "WhatsApp", "orçamento", "gastos"],
  authors: [{ name: "Pila" }],
  openGraph: {
    title: "Pila — Finanças Pessoais pelo WhatsApp",
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
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
