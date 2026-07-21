import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LandingAiChat } from "@/components/landing-ai-chat";
import { ProductEventTracker } from "@/components/product-event-tracker";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
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
  applicationName: "Pila",
  manifest: "/manifest.webmanifest",
  verification: {
    google: "0biihb-npAIgtOy5GoqNScEF5f-39aAipA8vdw8brcY",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pila",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Pila — Sua IA financeira no WhatsApp",
    description: "Organize suas finanças conversando com uma IA pelo WhatsApp usando texto, áudio ou foto.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#0B0F19",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        <LandingAiChat />
        <ProductEventTracker />
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
