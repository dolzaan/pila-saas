export type DefaultCategoryKind = "EXPENSE" | "INCOME";

export type DefaultCategory = {
  name: string;
  icon: string;
  kind: DefaultCategoryKind;
};

export const DEFAULT_CATEGORIES = [
  // Despesas
  { name: "Alimentação", icon: "🍔", kind: "EXPENSE" },
  { name: "Mercado", icon: "🛒", kind: "EXPENSE" },
  { name: "Transporte", icon: "🚗", kind: "EXPENSE" },
  { name: "Moradia", icon: "🏠", kind: "EXPENSE" },
  { name: "Contas e serviços", icon: "💡", kind: "EXPENSE" },
  { name: "Saúde", icon: "❤️", kind: "EXPENSE" },
  { name: "Educação", icon: "📚", kind: "EXPENSE" },
  { name: "Lazer", icon: "🎮", kind: "EXPENSE" },
  { name: "Roupas", icon: "👕", kind: "EXPENSE" },
  { name: "Assinaturas", icon: "📱", kind: "EXPENSE" },
  { name: "Viagem", icon: "✈️", kind: "EXPENSE" },
  { name: "Pets", icon: "🐾", kind: "EXPENSE" },
  { name: "Beleza", icon: "💅", kind: "EXPENSE" },
  { name: "Impostos e taxas", icon: "🧾", kind: "EXPENSE" },
  { name: "Dívidas e empréstimos", icon: "🏦", kind: "EXPENSE" },
  { name: "Manutenção", icon: "🔧", kind: "EXPENSE" },
  { name: "Presentes e doações", icon: "🎁", kind: "EXPENSE" },
  { name: "Outros", icon: "📦", kind: "EXPENSE" },

  // Receitas
  { name: "Salário", icon: "💼", kind: "INCOME" },
  { name: "Freelance", icon: "💻", kind: "INCOME" },
  { name: "Vendas", icon: "🏷️", kind: "INCOME" },
  { name: "Investimentos", icon: "📈", kind: "INCOME" },
  { name: "Aluguéis", icon: "🔑", kind: "INCOME" },
  { name: "Benefícios", icon: "🎫", kind: "INCOME" },
  { name: "Reembolsos", icon: "↩️", kind: "INCOME" },
  { name: "Prêmios e bônus", icon: "🏆", kind: "INCOME" },
  { name: "Transferência", icon: "🔄", kind: "INCOME" },
  { name: "Outros (Receita)", icon: "💰", kind: "INCOME" },
] as const satisfies readonly DefaultCategory[];

export const DEFAULT_EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (category) => category.kind === "EXPENSE",
);

export const DEFAULT_INCOME_CATEGORIES = DEFAULT_CATEGORIES.filter(
  (category) => category.kind === "INCOME",
);
