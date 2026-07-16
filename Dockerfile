FROM node:20-alpine AS base
WORKDIR /app

FROM base AS builder
# Instala dependências nativas necessárias para o Prisma ou outros pacotes
RUN apk add --no-cache libc6-compat openssl

# Copia os arquivos de lock e package.json
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/

# Instala todas as dependências
RUN npm install

# Copia todo o código fonte
COPY . .

# Gera o cliente do Prisma
RUN npm run db:generate

# Faz o build do Next.js
# O NEXT_PUBLIC_ variables podem precisar ser passadas aqui se forem usadas no build,
# mas como configuramos 'output: standalone', ele vai preparar a build.
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia os assets estáticos necessários
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set the correct permission for prerender cache
RUN mkdir -p /app/apps/web/.next
RUN chown nextjs:nodejs /app/apps/web/.next

# Copia a build standalone
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# O standalone cria a estrutura exata do projeto. Então rodamos o server.js
CMD ["node", "apps/web/server.js"]
