import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LandingAiChat } from "@/components/landing-ai-chat";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pila — Finanças Pessoais pelo WhatsApp",
    template: "%s — Pila",
  },
  description:
    "Converse com uma IA financeira pelo WhatsApp. Envie texto, áudio ou foto para registrar gastos, consultar relatórios e organizar seu dinheiro.",
  keywords: ["IA financeira", "finanças pessoais", "controle financeiro", "WhatsApp", "orçamento", "gastos"],
  authors: [{ name: "Pila" }],
  openGraph: {
    title: "Pila — Sua IA financeira no WhatsApp",
    description: "Organize suas finanças conversando com uma IA pelo WhatsApp usando texto, áudio ou foto.",
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
        <LandingAiChat />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
