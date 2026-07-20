# Cartões — segunda fase

## Compras parceladas

O WhatsApp aceita mensagens como:

- `Comprei um celular de 1200 no Nubank em 10 vezes`
- `Passei 300 em 3x no cartão Inter`

O valor é dividido em centavos sem alterar o total original. Cada parcela recebe:

- grupo de parcelamento;
- número e quantidade total de parcelas;
- valor original da compra;
- data de compra;
- data de fechamento da fatura;
- data de vencimento.

As parcelas são distribuídas nas faturas seguintes de acordo com o fechamento e vencimento cadastrados no cartão.

## Ciclo da fatura

Compras feitas até o dia de fechamento entram na fatura atual. Compras posteriores entram na fatura seguinte. Dias inexistentes em meses curtos são ajustados para o último dia do mês.

## Pagamento de fatura

Mensagens como `Paguei a fatura do Nubank de R$ 800` registram um pagamento separado. O pagamento não cria receita nem despesa, evitando duplicidade nos relatórios.

Sem valor informado, o Pila usa o saldo estimado da fatura pendente. Valores maiores que o saldo estimado são rejeitados para conferência.

## Limitações

- os valores são estimativas baseadas apenas nos registros existentes no Pila;
- pagamentos realizados fora do Pila precisam ser informados para liberar o limite estimado;
- cartões sem fechamento e vencimento cadastrados não podem receber parcelamentos automáticos.
