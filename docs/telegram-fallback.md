# Telegram como canal de contingência

O Telegram reutiliza o mesmo processador financeiro do webhook do WhatsApp. O usuário precisa vincular o Telegram previamente em **Configurações > Telegram**.

## 1. Criar o bot

1. Abra o `@BotFather` no Telegram.
2. Execute `/newbot`.
3. Guarde o token e o username retornados.
4. Não publique o token no GitHub, logs ou conversas.

## 2. Configurar variáveis

```env
TELEGRAM_BOT_TOKEN="token-fornecido-pelo-botfather"
TELEGRAM_BOT_USERNAME="username-sem-arroba"
TELEGRAM_WEBHOOK_SECRET="segredo-aleatorio-independente"
TELEGRAM_TIMEOUT_MS="15000"
```

O `WHATSAPP_WEBHOOK_SECRET` também precisa estar configurado, pois o Telegram chama o processador interno já usado pela Evolution API.

## 3. Registrar o webhook

Depois do deploy em produção:

```bash
sudo curl -X POST \
  "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://SEU_DOMINIO/api/webhooks/telegram\",\"secret_token\":\"$TELEGRAM_WEBHOOK_SECRET\",\"allowed_updates\":[\"message\"],\"drop_pending_updates\":true}"
```

Para conferir:

```bash
sudo curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

## 4. Fluxo do usuário

1. O usuário precisa já ter o WhatsApp vinculado ao Pila.
2. Acessa **Configurações > Telegram**.
3. Toca em **Conectar Telegram**.
4. Abre o link temporário e toca em **Iniciar** no bot.
5. O Telegram passa a executar lançamentos, consultas, lembretes e relatórios pelo mesmo processador do WhatsApp.

## Segurança

- O webhook exige o header `X-Telegram-Bot-Api-Secret-Token`.
- O vínculo usa token aleatório de uso único, válido por 10 minutos.
- Apenas conversas privadas são aceitas.
- Mensagens mantêm a idempotência pelo ID do update do Telegram.
- Respostas originadas no Telegram não são enviadas nem enfileiradas no WhatsApp.
