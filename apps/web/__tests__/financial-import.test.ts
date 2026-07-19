import { describe, expect, it } from "vitest";
import { FinancialImportError, parseFinancialImport } from "@/lib/financial-import";

describe("parseFinancialImport", () => {
  it("interpreta CSV brasileiro com valor, sinal e campos entre aspas", () => {
    const result = parseFinancialImport({
      accountId: "account-1",
      fileName: "extrato.csv",
      content: [
        "Data;Descrição;Valor",
        '19/07/2026;"Mercado, bairro";-1.234,56',
        "20/07/2026;Salário;5000,00",
      ].join("\n"),
    });

    expect(result.format).toBe("CSV");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      description: "Mercado, bairro",
      amount: 1234.56,
      kind: "EXPENSE",
      sourceRow: 2,
    });
    expect(result.rows[1]).toMatchObject({
      description: "Salário",
      amount: 5000,
      kind: "INCOME",
    });
  });

  it("aceita colunas separadas de débito e crédito", () => {
    const result = parseFinancialImport({
      accountId: "account-1",
      fileName: "extrato.csv",
      content: [
        "date,description,debit,credit",
        "2026-07-18,Café,12.50,",
        "2026-07-19,Pix recebido,,250.00",
      ].join("\n"),
    });

    expect(result.rows.map(({ amount, kind }) => ({ amount, kind }))).toEqual([
      { amount: 12.5, kind: "EXPENSE" },
      { amount: 250, kind: "INCOME" },
    ]);
  });

  it("interpreta OFX e usa o FITID para manter a deduplicação estável", () => {
    const content = `
      <OFX>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260719120000[-3:BRT]
            <TRNAMT>-300.00
            <FITID>bank-123
            <NAME>MERCADO
            <MEMO>Compra semanal &amp; hortifruti
          </STMTTRN>
        </BANKTRANLIST>
      </OFX>
    `;

    const first = parseFinancialImport({
      accountId: "account-1",
      fileName: "extrato.ofx",
      content,
    });
    const second = parseFinancialImport({
      accountId: "account-1",
      fileName: "novo-nome.qfx",
      content,
    });

    expect(first.rows[0]).toMatchObject({
      amount: 300,
      kind: "EXPENSE",
      description: "MERCADO — Compra semanal & hortifruti",
      externalId: "bank-123",
    });
    expect(first.rows[0].fingerprint).toBe(second.rows[0].fingerprint);
  });

  it("preserva lançamentos idênticos usando a ocorrência no arquivo", () => {
    const result = parseFinancialImport({
      accountId: "account-1",
      fileName: "extrato.csv",
      content: [
        "data;descricao;valor",
        "19/07/2026;Pedágio;-10,00",
        "19/07/2026;Pedágio;-10,00",
      ].join("\n"),
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].fingerprint).not.toBe(result.rows[1].fingerprint);
  });

  it("ignora linhas inválidas e informa a quantidade", () => {
    const result = parseFinancialImport({
      accountId: "account-1",
      fileName: "extrato.csv",
      content: [
        "data;descricao;valor",
        "data-invalida;Linha ruim;-10,00",
        "19/07/2026;Linha boa;-20,00",
      ].join("\n"),
    });

    expect(result.rows).toHaveLength(1);
    expect(result.ignoredRows).toBe(1);
  });

  it("rejeita CSV sem coluna financeira reconhecida", () => {
    expect(() =>
      parseFinancialImport({
        accountId: "account-1",
        fileName: "extrato.csv",
        content: "data;descricao\n19/07/2026;Teste",
      }),
    ).toThrow(FinancialImportError);
  });
});
