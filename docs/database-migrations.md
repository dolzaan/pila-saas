# Migrações do banco de dados

O projeto mantém as migrações Prisma em `packages/database/prisma/migrations`.

## Comandos

- `npm run db:migrate:dev -- --name nome_da_migracao`: cria e aplica uma migração no banco de desenvolvimento.
- `npm run db:migrate:deploy`: aplica somente migrações pendentes, sem prompt e sem banco sombra. Use em CI e produção.
- `npm run db:migrate:status`: mostra o estado das migrações.
- `npm run db:migrate:baseline`: marca a migração inicial `0_init` como já aplicada. Use uma única vez e somente em um banco existente que já contém as tabelas.

Nunca execute `migrate dev` em produção.

## Fluxo de desenvolvimento

1. Altere `schema.prisma`.
2. Execute `npm run db:migrate:dev -- --name descricao_curta`.
3. Revise e versione o novo diretório em `prisma/migrations`.
4. Abra o PR. O CI recria um banco vazio usando `migrate deploy`.

## Adoção da baseline no banco existente

A migração `0_init` representa o schema que já existe em produção. Antes de habilitar `migrate deploy` no deploy da Vercel, marque essa baseline como aplicada no banco existente:

```bash
DATABASE_URL="$POSTGRES_URL_NON_POOLING" npm run db:migrate:baseline
DATABASE_URL="$POSTGRES_URL_NON_POOLING" npm run db:migrate:status
```

Use a conexão direta/não agrupada para migrações. Não use a URL do PgBouncer em modo transação.

Atenção: em um banco vazio, não execute `db:migrate:baseline`. Execute apenas `db:migrate:deploy`, que criará todas as tabelas.

## Vercel

Depois que a baseline estiver marcada no Supabase, configure permanentemente o Build Command do projeto `apps/web`:

```bash
DATABASE_URL="$POSTGRES_URL_NON_POOLING" npm --prefix ../.. run db:migrate:deploy && npm run build
```

A primeira parte aplica migrações pendentes; a segunda mantém o build do Next.js.
