# Pila — Gestão financeira pelo WhatsApp

O **Pila** é um SaaS de finanças pessoais que permite registrar gastos, receitas, compras parceladas, lembretes e consultas financeiras por meio de mensagens no WhatsApp, além de oferecer um painel web completo.

A proposta é reduzir o atrito de manter a vida financeira organizada: o usuário conversa naturalmente com o Pila Bot e acompanha os resultados no dashboard.

## Principais recursos

- registro manual e pelo WhatsApp;
- interpretação de texto, áudio, imagem e PDF com Gemini;
- categorias e regras automáticas;
- contas bancárias, dinheiro e cartões de crédito;
- compras parceladas e ciclo de faturas;
- pagamento parcial ou total de fatura sem duplicar despesas;
- orçamentos mensais e metas financeiras;
- contas recorrentes e lembretes;
- relatórios e gráficos;
- importação e conciliação de extratos;
- onboarding guiado para novos usuários;
- suporte humano pelo WhatsApp;
- assinatura mensal com Stripe;
- exportação e exclusão de dados para LGPD;
- autenticação por senha e Google OAuth.

## Stack

| Camada | Tecnologia |
|---|---|
| Aplicação | Next.js 16, React 19 e TypeScript |
| Interface | Tailwind CSS e CSS Modules |
| Banco | PostgreSQL e Prisma ORM |
| Autenticação | Auth.js v5 |
| Inteligência artificial | Google Gemini |
| WhatsApp | Evolution API |
| Rate limiting | Upstash Redis |
| Pagamentos | Stripe |
| E-mail | EmailJS |
| Hospedagem | Vercel e Supabase PostgreSQL |
| Testes | Vitest e GitHub Actions |

## Arquitetura resumida

```text
Usuário
  ├── Navegador ──> Next.js ──> Prisma ──> PostgreSQL
  └── WhatsApp ──> Evolution API ──> Webhook Next.js
                                      ├── trava de vínculo
                                      ├── idempotência
                                      ├── Gemini
                                      └── domínio financeiro
```

As decisões financeiras são confirmadas pelo backend. A IA não recebe nem escolhe IDs internos de usuários, contas ou cartões.

## Estrutura do repositório

```text
pila-saas/
├── apps/
│   └── web/                    # aplicação Next.js e webhooks
├── packages/
│   └── database/               # Prisma, migrations e categorias padrão
├── docs/                       # operação, privacidade e arquitetura
├── .github/workflows/ci.yml    # lint, testes e build
├── docker-compose.yml
└── .env.example
```

## Requisitos locais

- Node.js 20 ou superior;
- npm;
- Docker Desktop ou PostgreSQL e Redis disponíveis separadamente.

## Instalação

### 1. Clonar e instalar

```bash
git clone https://github.com/dolzaan/pila-saas.git
cd pila-saas
npm install --legacy-peer-deps
```

### 2. Configurar as variáveis

```bash
cp .env.example .env
```

Preencha pelo menos:

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."
AUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

As integrações com Google, Gemini, Stripe, EmailJS, Evolution e Upstash são opcionais para partes específicas da aplicação, mas devem ser configuradas antes de validar os respectivos fluxos.

### 3. Subir serviços locais

```bash
docker compose up -d
```

### 4. Preparar o banco

```bash
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
```

### 5. Iniciar

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run test

npm run db:generate
npm run db:migrate:dev
npm run db:migrate:deploy
npm run db:migrate:status
npm run db:seed
npm run db:studio
```

Use `db:push` apenas em desenvolvimento. Em produção, aplique migrations versionadas com `db:migrate:deploy`.

## Deploy

Antes de publicar:

1. configure as variáveis na Vercel;
2. utilize a URL pooled do Supabase em runtime;
3. utilize a URL direta do banco somente para migrations;
4. configure os webhooks do Stripe e da Evolution;
5. configure o `CRON_SECRET`;
6. aplique as migrations;
7. valide login, transação manual, vínculo do WhatsApp e checkout.

Consulte:

- [`docs/database-migrations.md`](docs/database-migrations.md);
- [`docs/privacy-and-ai.md`](docs/privacy-and-ai.md);
- [`docs/credit-card-phase-two.md`](docs/credit-card-phase-two.md).

## Privacidade e segurança

- mensagens brutas ficam desabilitadas por padrão;
- dados diretos são mascarados antes de serem enviados à IA;
- números de cartão, CVV, senha e códigos não devem ser solicitados;
- webhooks e crons utilizam segredos independentes;
- mensagens do WhatsApp possuem idempotência;
- números não vinculados não podem criar movimentações;
- assinaturas reais são canceladas antes da exclusão da conta.

Leia [`docs/privacy-and-ai.md`](docs/privacy-and-ai.md) para detalhes e limitações.

## Observação sobre o WhatsApp

A Evolution API depende de uma integração não oficial com o WhatsApp. Utilize um número dedicado e considere uma migração para a API oficial antes de operar em grande escala. Existe risco de desconexão ou bloqueio do número.

## Status do produto

O Pila já possui os fluxos principais de cadastro, gestão financeira, WhatsApp, cartões, relatórios e assinatura. As próximas prioridades são:

- consistência de saldos entre contas e cartões;
- testes de ponta a ponta;
- observabilidade e recuperação de falhas;
- métricas de ativação, retenção e conversão;
- preparação para integração oficial do WhatsApp.

## Licença e uso

O repositório é privado e o uso deve respeitar os termos dos serviços integrados, especialmente WhatsApp, Google Gemini, Stripe, Supabase e EmailJS.
