# Transferências entre contas

Transferências movimentam dinheiro entre duas contas do mesmo usuário sem criar receita ou despesa.

## Regras

- origem e destino precisam ser contas ativas do usuário;
- origem e destino devem ser diferentes;
- cartões de crédito não participam deste fluxo;
- pagamentos de cartão continuam registrados como pagamentos de fatura;
- o valor precisa ser positivo e não pode superar o saldo disponível da origem;
- transferências não entram nos totais de receitas, despesas, categorias e orçamentos;
- o saldo total entre as contas permanece igual depois da operação.

## Cálculo do saldo

Para contas comuns:

```text
saldo = saldo inicial
      + receitas
      - despesas
      - pagamentos de fatura
      + transferências recebidas
      - transferências enviadas
```

Para cartões de crédito, o cálculo continua separado e utiliza compras menos pagamentos de fatura.

## Compatibilidade

A tabela é acessada por consultas SQL tipadas, seguindo o mesmo padrão usado pelo estado de onboarding. Isso permite introduzir o domínio sem transformar transferências em transações artificiais.

## Próxima etapa

O reconhecimento de frases como `transfere 200 da conta Inter para a reserva` deve ser adicionado ao Pila Bot somente depois que a resolução de origem e destino puder ser feita de maneira determinística pelo backend.
