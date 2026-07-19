# Privacidade e uso de IA

Este documento descreve as proteções técnicas aplicadas ao envio de dados para serviços externos. Elas ajudam na privacidade, mas não substituem uma avaliação jurídica de conformidade com a LGPD.

## Minimização antes do Gemini

Antes de montar a requisição de texto, o servidor mascara:

- e-mails;
- CPF e CNPJ;
- telefones;
- números de cartão válidos pelo algoritmo de Luhn;
- identificadores UUID, que também podem ser usados como chave Pix.

O contexto financeiro enviado ao Gemini contém valores, datas, tipo e categoria. Descrições das transações anteriores não são mais incluídas. O dashboard envia no máximo dez transações recentes.

Imagens, áudios e PDFs ainda são enviados ao Gemini quando o usuário solicita leitura de mídia. Esses arquivos não podem ser mascarados pelo filtro textual.

## Mensagens brutas do WhatsApp

O armazenamento de `rawMessage` agora é desabilitado por padrão:

```env
STORE_RAW_MESSAGES=false
```

Se houver uma necessidade legítima de auditoria, habilite explicitamente. Mesmo habilitado, identificadores diretos são mascarados antes da gravação:

```env
STORE_RAW_MESSAGES=true
RAW_MESSAGE_RETENTION_DAYS=60
```

A retenção aceita de 30 a 90 dias. O cron diário `/api/cron/privacy-retention` remove o conteúdo de `rawMessage` após esse prazo sem excluir a transação financeira.

O arquivo `apps/web/vercel.json` agenda a limpeza diariamente. A Vercel envia automaticamente o `CRON_SECRET` no cabeçalho de autorização nos deploys de produção.

## Timeouts

Os tempos máximos são configuráveis em milissegundos:

```env
GEMINI_TIMEOUT_MS=25000
EVOLUTION_TIMEOUT_MS=15000
EMAILJS_TIMEOUT_MS=10000
STRIPE_TIMEOUT_MS=20000
```

Valores abaixo de 1 segundo ou acima de 60 segundos são limitados automaticamente. O Stripe também utiliza duas tentativas de rede para falhas transitórias.

## Próximas etapas

Este PR não inclui criptografia com chave gerenciada, exportação/exclusão da conta, confirmação de lançamentos altos ou a função de desfazer. Essas mudanças devem ser entregues separadamente para permitir migração, rotação de chave e testes de autorização adequados.
