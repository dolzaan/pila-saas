import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite importar pacotes do monorepo (packages/database)
  transpilePackages: ["@finzap/database"],

  // Habilita React strict mode para detectar problemas cedo
  reactStrictMode: true,

  // Configura domínios de imagens (Google Avatar para OAuth)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },

  // Habilita build standalone para Docker
  output: "standalone",

  // Variáveis de ambiente expostas ao cliente (prefixo NEXT_PUBLIC_)
  // Adicionar aqui apenas o que é seguro expor
  env: {
    NEXT_PUBLIC_APP_NAME: "Pila",
  },
};

export default nextConfig;
