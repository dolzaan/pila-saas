import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@finzap/database"],
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      { source: "/features", destination: "/recursos", permanent: true },
      { source: "/how-it-works", destination: "/como-funciona", permanent: true },
      { source: "/security", destination: "/seguranca", permanent: true },
      { source: "/privacy", destination: "/privacidade", permanent: true },
      { source: "/terms", destination: "/termos", permanent: true },
      { source: "/register", destination: "/cadastro", permanent: true },
      { source: "/dashboard", destination: "/painel", permanent: true },
      { source: "/dashboard/transactions/:path*", destination: "/painel/movimentacoes/:path*", permanent: true },
      { source: "/dashboard/accounts/:path*", destination: "/painel/contas/:path*", permanent: true },
      { source: "/dashboard/agenda/:path*", destination: "/painel/agenda/:path*", permanent: true },
      { source: "/dashboard/planning/:path*", destination: "/painel/planejamento/:path*", permanent: true },
      { source: "/dashboard/budgets/:path*", destination: "/painel/orcamentos/:path*", permanent: true },
      { source: "/dashboard/reconciliation/:path*", destination: "/painel/conciliacao/:path*", permanent: true },
      { source: "/dashboard/reports/:path*", destination: "/painel/relatorios/:path*", permanent: true },
      { source: "/dashboard/categories/:path*", destination: "/painel/categorias/:path*", permanent: true },
      { source: "/dashboard/whatsapp/:path*", destination: "/painel/whatsapp/:path*", permanent: true },
      { source: "/dashboard/settings/:path*", destination: "/painel/configuracoes/:path*", permanent: true },
    ];
  },

  output: "standalone",

  env: {
    NEXT_PUBLIC_APP_NAME: "Pila",
  },
};

export default nextConfig;
