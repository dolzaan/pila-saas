# Operação e resposta a incidentes

## Endpoint de saúde

O endpoint público `GET /api/health` verifica:

- PostgreSQL;
- Redis persistente usado no rate limiting;
- conexão da Evolution API;
- presença das configurações do Gemini, Stripe e EmailJS.

Respostas possíveis:

- `OPERATIONAL`: todos os serviços configurados estão funcionando;
- `DEGRADED`: a aplicação está disponível, mas uma integração está desconectada ou não configurada;
- `UNAVAILABLE`: o banco de dados não respondeu e a aplicação não está pronta para operar.

O endpoint devolve HTTP `503` apenas quando o serviço central está indisponível. Cada resposta contém `X-Request-Id`, que pode ser usado para correlacionar logs.

## Logs estruturados

Novos logs devem usar `logger.info`, `logger.warn` ou `logger.error` de `apps/web/lib/logger.ts`.

Exemplo:

```ts
logger.error("stripe_webhook_failed", {
  requestId,
  eventType,
  error,
});
```

O logger remove automaticamente campos com nomes sensíveis, incluindo:

- senha;
- tokens e segredos;
- cookies e autorização;
- número de telefone e e-mail;
- cartão e CVV;
- mensagens brutas e mídia em base64.

Nunca adicione o conteúdo completo de mensagens, comprovantes ou respostas de provedores aos logs.

## Procedimento de incidente

### Banco de dados indisponível

1. Consulte `/api/health` e confirme `database: UNAVAILABLE`.
2. Verifique o status do Supabase e o limite de conexões.
3. Confirme se a aplicação usa a URL pooled em runtime e a URL direta somente nas migrations.
4. Evite executar `prisma db push` em produção.
5. Após a recuperação, valide login, criação de transação e webhook do WhatsApp.

### WhatsApp desconectado

1. Consulte `/api/health` e confirme o estado da Evolution.
2. Verifique a instância configurada por `EVOLUTION_INSTANCE_NAME`.
3. Confirme a URL e a chave da Evolution API.
4. Reconecte a instância pelo painel administrativo.
5. Teste uma mensagem de texto e uma mídia.

### Redis indisponível

1. Confirme as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
2. Verifique a disponibilidade do Upstash.
3. O Pila deve bloquear chamadas protegidas quando não puder garantir o rate limiting.
4. Depois da recuperação, teste o chat público e uma mensagem do bot.

### Gemini indisponível

1. Confirme a chave e a cota do projeto.
2. Consulte os logs por `Gemini API` e pelo `requestId` relacionado.
3. Transações não devem ser criadas quando a interpretação não for validada.
4. Oriente o usuário a tentar novamente ou usar o lançamento manual.

### Stripe indisponível

1. Não altere manualmente o plano do usuário sem verificar o evento no Stripe.
2. Consulte o histórico do webhook e o `stripeSubscriptionId`.
3. Reprocesse o evento somente após confirmar idempotência.
4. Nunca exclua uma conta local antes de cancelar uma assinatura real.

## Checklist depois de um deploy

- `/api/health` responde sem `UNAVAILABLE`;
- login por credenciais funciona;
- criação manual de transação funciona;
- dashboard e página de contas carregam;
- webhook do WhatsApp rejeita chamadas sem segredo;
- número não vinculado não cria movimentações;
- Stripe aponta para o domínio de produção;
- crons de lembretes e retenção aparecem ativos na Vercel.
