# Fila durável de saída do WhatsApp

Quando uma mensagem de texto falha no envio imediato pela Evolution API, o Pila tenta armazená-la de forma criptografada para uma nova tentativa.

## Proteção dos dados

O número e o conteúdo são criptografados com AES-256-GCM antes de serem gravados no PostgreSQL.

Configure uma chave de 32 bytes em base64:

```bash
openssl rand -base64 32
```

```env
PILA_DATA_ENCRYPTION_KEY="..."
```

Sem uma chave válida, a mensagem não é persistida. O erro é registrado sem expor o número ou o conteúdo.

## Estados

- `PENDING`: aguardando tentativa;
- `PROCESSING`: reservado por um processador;
- `SENT`: entregue à Evolution API;
- `FAILED`: falhou e poderá ser tentado novamente;
- `DEAD`: atingiu o limite de cinco tentativas.

Registros presos em `PROCESSING` por mais de 15 minutos voltam para `FAILED`.

## Reprocessamento

O endpoint protegido é:

```text
GET /api/cron/whatsapp-outbox
```

Ele exige `Authorization: Bearer <CRON_SECRET>` e processa até 25 mensagens por execução.

A Vercel executa esse endpoint uma vez ao dia, compatível com a limitação do plano Hobby. Em planos que permitam maior frequência, a expressão pode ser aumentada para reduzir o tempo de espera.

O reprocessamento usa atrasos progressivos registrados em `nextAttemptAt`. A Vercel não repete automaticamente crons com falha, então o próprio endpoint mantém tentativas e estado durável.

## Limitações

- somente mensagens de texto são persistidas;
- mídias em base64 não entram na fila para evitar armazenamento de arquivos financeiros grandes;
- trocar a chave sem migrar os registros existentes torna as mensagens pendentes ilegíveis;
- a fila confirma aceitação pela Evolution API, não leitura pelo destinatário.
