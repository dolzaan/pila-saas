# Pila — Gestão Financeira Pessoal via WhatsApp

O **Pila** é uma plataforma SaaS (Software as a Service) open-source projetada para simplificar a gestão financeira pessoal. Em vez de usar planilhas complexas, você simplesmente manda um áudio ou texto pelo WhatsApp, e nossa Inteligência Artificial (Gemini) entende e registra o gasto ou receita automaticamente no seu painel web.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend + Backend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Banco de dados | PostgreSQL + Prisma ORM |
| Autenticação | Auth.js (e-mail/senha + Google OAuth) |
| Bot WhatsApp | Baileys (não-oficial) |
| Filas | BullMQ + Redis |
| Pagamentos | Stripe |

---

## Setup Local

### Pré-requisitos

- Node.js 20+
- Docker Desktop (para Postgres e Redis)

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/finzap.git
cd finzap
npm install --legacy-peer-deps
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

| Variável | Como obter |
|---|---|
| `DATABASE_URL` | Deixe como está — aponta para o Docker local |
| `REDIS_URL` | Deixe como está — aponta para o Docker local |
| `NEXTAUTH_SECRET` | Execute: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/) → APIs → Credenciais OAuth |
| `GOOGLE_CLIENT_SECRET` | Mesmo lugar do acima |

> Para login apenas com e-mail/senha, `GOOGLE_*` pode ficar com placeholder na Fase 1.

### 3. Subir os serviços locais (banco + redis)

```bash
docker compose up -d
```

Aguarde os containers ficarem healthy:

```bash
docker compose ps
```

### 4. Criar as tabelas do banco e carregar dados iniciais

```bash
npm run db:migrate:deploy  # cria o schema a partir das migrações versionadas
npm run db:seed            # insere categorias padrão
```

### 5. Iniciar o servidor de desenvolvimento

```bash
pnpm dev              # Next.js em http://localhost:3000
```

---

## Scripts disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia o Next.js em modo dev

# Build e qualidade
npm run build            # Build de produção
npm run lint             # ESLint em todos os pacotes
npm run test             # Vitest em todos os pacotes

# Banco de dados
npm run db:generate          # Gera Prisma client
npm run db:migrate:dev       # Cria/aplica migrações somente em desenvolvimento
npm run db:migrate:deploy    # Aplica migrações pendentes em CI/produção
npm run db:migrate:status    # Exibe o estado das migrações
npm run db:push              # Sync schema sem migração (só dev)
npm run db:seed              # Carrega dados iniciais
npm run db:studio            # Prisma Studio na porta 5555

# Docker
docker compose up -d        # Sobe Postgres + Redis
docker compose down         # Para os containers
docker compose down -v      # Para e apaga volumes (reset total)
```

---

## Estrutura do Projeto

```
finzap/
├── apps/
│   ├── web/          # Next.js — painel web
│   └── bot/          # Serviço Node.js — bot WhatsApp (Fase 3+)
├── packages/
│   └── database/     # Schema Prisma compartilhado
├── .github/
│   └── workflows/ci.yml
├── docker-compose.yml
└── .env.example
```

---

## Variáveis de Ambiente

Ver [.env.example](.env.example) com documentação de cada variável.

Consulte também [docs/privacy-and-ai.md](docs/privacy-and-ai.md) para retenção de mensagens, minimização antes da IA e timeouts das integrações.

O fluxo de baseline e deploy do banco está documentado em [docs/database-migrations.md](docs/database-migrations.md).

---

## Fases de implementação

- [x] **Fase 1** — Fundação: Next.js, Auth.js, Prisma, CI
- [ ] **Fase 2** — Painel financeiro: CRUD transações/categorias, dashboard
- [ ] **Fase 3** — Serviço bot: Baileys, conexão WhatsApp
- [ ] **Fase 4** — Vínculo e parser: linguagem natural → transação
- [ ] **Fase 5** — Orçamentos e alertas
- [ ] **Fase 6** — Stripe e monetização
- [ ] **Fase 7** — Hardening: testes, LGPD, segurança

---

## Aviso Legal

O bot usa [Baileys](https://github.com/WhiskeySockets/Baileys), uma biblioteca não-oficial que acessa o WhatsApp via engenharia reversa do protocolo Web. **Isso viola os Termos de Serviço do WhatsApp/Meta.** Use um número dedicado exclusivamente para o bot — nunca seu número pessoal. Existe risco de banimento, especialmente com alto volume.
