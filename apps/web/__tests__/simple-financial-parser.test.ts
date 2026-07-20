import { describe, expect, it } from "vitest";
import { parseSimpleFinancialMessage } from "@/lib/simple-financial-parser";

const ACCOUNT_CONTEXT = `
CONTAS E CARTÕES CADASTRADOS:
- Nome exato: Conta Inter | Tipo: conta corrente
- Nome exato: Nubank | Tipo: cartão de crédito | Limite cadastrado: R$ 2.000,00
`.trim();

const SHORT_ACCOUNT_CONTEXT = `
CONTAS E CARTÕES CADASTRADOS:
- Nome exato: Inter | Tipo: conta corrente
`.trim();

describe("parseSimpleFinancialMessage", () => {
  it("entende o lançamento simples informado pelo usuário", () => {
    expect(parseSimpleFinancialMessage("gastei 10 reais no mercado")).toMatchObject({
      isTransaction: true,
      amount: 10,
      kind: "EXPENSE",
      description: "Mercado",
      categoryName: "Mercado",
      installments: 1,
    });
  });

  it("entende centavos e valor no formato brasileiro", () => {
    expect(parseSimpleFinancialMessage("gastei R$ 1.250,90 no supermercado")).toMatchObject({
      isTransaction: true,
      amount: 1250.9,
      kind: "EXPENSE",
      categoryName: "Mercado",
    });
  });

  it("identifica receita e multiplicador mil", () => {
    expect(parseSimpleFinancialMessage("recebi 3 mil de salário")).toMatchObject({
      isTransaction: true,
      amount: 3000,
      kind: "INCOME",
      description: "Salário",
      categoryName: "Salário",
    });
  });

  it("identifica categoria e pagamento por Pix", () => {
    expect(parseSimpleFinancialMessage("paguei 25 no uber via pix")).toMatchObject({
      isTransaction: true,
      amount: 25,
      kind: "EXPENSE",
      categoryName: "Transporte",
      paymentMethod: "PIX",
    });
  });

  it("identifica cartão cadastrado pelo contexto", () => {
    expect(parseSimpleFinancialMessage(
      "comprei um lanche de 18,50 no Nubank",
      ACCOUNT_CONTEXT,
    )).toMatchObject({
      isTransaction: true,
      amount: 18.5,
      kind: "EXPENSE",
      categoryName: "Alimentação",
      paymentMethod: "CREDIT_CARD",
      financialAccountName: "Nubank",
    });
  });

  it("não confunde o nome Inter com a palavra internet", () => {
    const result = parseSimpleFinancialMessage(
      "gastei 100 reais na internet",
      SHORT_ACCOUNT_CONTEXT,
    );

    expect(result).toMatchObject({
      isTransaction: true,
      amount: 100,
      categoryName: "Contas e serviços",
    });
    expect(result?.financialAccountName).toBeUndefined();
  });

  it("não transforma perguntas em novas transações", () => {
    expect(parseSimpleFinancialMessage("quanto gastei no mercado?")).toBeNull();
    expect(parseSimpleFinancialMessage("qual é o meu saldo?")).toBeNull();
    expect(parseSimpleFinancialMessage("paguei a fatura do Nubank")).toBeNull();
    expect(parseSimpleFinancialMessage("eu gastei 10 reais?")).toBeNull();
  });

  it("deixa mensagens sem valor para o Gemini pedir esclarecimento", () => {
    expect(parseSimpleFinancialMessage("gastei no mercado")).toBeNull();
  });

  it("não confunde a quantidade de parcelas com o valor", () => {
    expect(parseSimpleFinancialMessage(
      "comprei em 10x um celular de 1200 no Nubank",
      ACCOUNT_CONTEXT,
    )).toMatchObject({
      isTransaction: true,
      amount: 1200,
      installments: 10,
      financialAccountName: "Nubank",
    });
  });
});
