import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@finzap/database/default-categories";

describe("categorias padrão do Pila", () => {
  it("mantém catálogos separados para despesas e receitas", () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(18);
    expect(DEFAULT_INCOME_CATEGORIES).toHaveLength(10);
    expect(DEFAULT_CATEGORIES).toHaveLength(28);
  });

  it("não repete nome dentro do mesmo tipo", () => {
    const keys = DEFAULT_CATEGORIES.map(
      (category) => `${category.kind}:${category.name.toLocaleLowerCase("pt-BR")}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("inclui as categorias essenciais do sistema", () => {
    expect(DEFAULT_CATEGORIES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Moradia", kind: "EXPENSE" }),
        expect.objectContaining({ name: "Contas e serviços", kind: "EXPENSE" }),
        expect.objectContaining({ name: "Salário", kind: "INCOME" }),
        expect.objectContaining({ name: "Investimentos", kind: "INCOME" }),
      ]),
    );
  });
});
