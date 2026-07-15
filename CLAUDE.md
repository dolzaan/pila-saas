# CLAUDE.md — FinZap

> Carregado automaticamente. Leia antes de qualquer sessão de desenvolvimento.
> Limite: 200 linhas. Atualizar ao tomar novas decisões arquiteturais.

---

## Comandos Essenciais

```bash
# Setup inicial (uma vez)
docker compose up -d          # Postgres:5432 + Redis:6379
npm install
npm run db:generate           # Gera Prisma client
npm run db:migrate            # Aplica migrações
npm run db:seed               # Categorias padrão

# Desenvolvimento
npm run dev                   # Next.js em localhost:3000

# Qualidade
npm run lint                  # ESLint em todos os workspaces
npm run test                  # Vitest em todos os workspaces
npm run build                 # Build de produção Next.js

# Banco de dados
npm run db:migrate            # Nova migração (prompt interativo)
npm run db:push               # Sync schema sem migração (só dev!)
npm run db:studio             # GUI Prisma Studio em localhost:5555
npm run db:seed               # Re-seed (idempotente)
```

---

## Estrutura do Monorepo

```
finzap/
├── apps/web/          → Next.js (App Router, TypeScript, Tailwind)
├── apps/bot/          → Serviço Node.js standalone (Baileys, Fase 3+)
├── packages/database/ → Schema Prisma compartilhado
└── docker-compose.yml → Postgres 16 + Redis 7 locais
```

---

## Decisões Arquiteturais Fixadas

### 1. npm workspaces (não pnpm)
pnpm causava ERR_PNPM_EPERM no Windows (rename atômico de binários nativos bloqueado pelo Defender). Migrado para **npm workspaces** (nativo no npm 7+). CI usa npm também.
**Não reverter para pnpm sem resolver o EPERM primeiro.**

### 2. Schema Prisma em `packages/database`
Ambos `apps/web` e `apps/bot` importam de `@finzap/database`. **Não duplique o schema.**

### 3. Bot como processo separado, nunca como serverless
Baileys exige WebSocket persistente. Deploy: Railway/Fly.io. O bot **não** é uma Next.js API route.

### 4. Auth.js v5 (next-auth@beta) com adaptador Prisma
Sessões JWT (não database sessions) — compatível com edge middleware.
Providers: Google OAuth + Credentials (e-mail/senha com bcrypt cost=12).

### 5. Bot: um único número central para todos os usuários
Identificação pelo número remetente da mensagem. **Nunca** uma sessão Baileys por usuário.

### 6. Sessão Baileys persistida no banco (`BotAuthState`)
Modelo `BotAuthState` no Prisma. Nunca no sistema de arquivos (containers são efêmeros).

### 7. Parser híbrido de mensagens
Regex → LLM fallback. Modelo: Claude Haiku via `@anthropic-ai/sdk`. Configurável via `ANTHROPIC_API_KEY`.

### 8. BullMQ + Redis para processamento assíncrono de mensagens
Mensagem chega via WebSocket Baileys → enfileirada imediatamente → worker processa.

### 9. Interface `WhatsAppProvider` como abstração
Toda lógica de Baileys fica atrás de uma interface. Permite migrar para Meta Cloud API sem reescrever handlers.

### 10. Sem `clsx` + `tailwind-merge` na Fase 1
Usando função `cn()` simples em `lib/utils.ts`. Adicionar `tailwind-merge` na Fase 2 se necessário.

---

## Convenções de Código

### TypeScript
- `strict: true` em todos os pacotes — sem exceções
- Sem `any` explícito — usar `unknown` e type guards
- Sem `!` (non-null assertion) sem comentário justificando

### Nomenclatura
- Arquivos: `kebab-case.ts` (exceto componentes React: `PascalCase.tsx`)
- Funções: `camelCase`
- Tipos/Interfaces: `PascalCase`
- Constantes de ambiente: `SCREAMING_SNAKE_CASE`

### Banco de dados
- Valores monetários: `Decimal` no Prisma, `number` no TypeScript (cuidado com float!)
- Datas: sempre UTC no banco, converter para `pt-BR` apenas na UI
- IDs: `cuid()` — mais seguro que uuid v4 para URLs

### Segurança (OBRIGATÓRIO)
- **Nunca** logar: valores financeiros, conteúdo de mensagens WhatsApp, senhas, tokens
- Toda rota de API valida input com Zod antes de qualquer operação
- Hash de senha: `bcrypt` com cost factor 12 (`bcrypt.hash(password, 12)`)
- Dados do usuário sempre acessados com `where: { userId: session.user.id }`

### API Routes (Next.js App Router)
- Retornar `NextResponse.json(data, { status })` — nunca `Response` diretamente
- Catch errors → logar `err.message` (nunca o body da request)
- Rate limiting: implementar na Fase 7 com `upstash/ratelimit`

---

## Variáveis de Ambiente

Ver `.env.example` na raiz. **Nunca commitar `.env`.**

Críticas para rodar localmente:
- `DATABASE_URL` — PostgreSQL (Docker: `postgresql://finzap:finzap@localhost:5432/finzap`)
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000`

---

## Fases

| Fase | Status | Entregável |
|------|--------|------------|
| 1 — Fundação | ✅ | Login funcionando |
| 2 — Painel manual | ⬜ | CRUD transações + dashboard |
| 3 — Serviço bot | ⬜ | Bot conectado ao WhatsApp |
| 4 — Vínculo + parser | ⬜ | Registrar gasto via WhatsApp |
| 5 — Orçamentos | ⬜ | Alertas de estouro |
| 6 — Stripe | ⬜ | Planos grátis/pro |
| 7 — Hardening | ⬜ | Testes E2E, LGPD, segurança |

---

## Planos de Assinatura (definidos)

- **Grátis:** 50 transações/mês, sem exportação CSV, sem relatórios anuais
- **Pro (R$ 19,90/mês):** ilimitado, exportação CSV, relatórios anuais, alertas de orçamento via WhatsApp
