export type FinancialAccountAiType =
  | "CHECKING"
  | "SAVINGS"
  | "CASH"
  | "CREDIT_CARD"
  | "INVESTMENT"
  | "OTHER";

export type FinancialAccountForAi = {
  id: string;
  name: string;
  type: FinancialAccountAiType;
  creditLimit: number | null;
  closingDay: number | null;
  dueDay: number | null;
};

export type CardQuery =
  | "AVAILABLE_LIMIT"
  | "CURRENT_INVOICE"
  | "CLOSING_DAY"
  | "DUE_DAY";

export type FinancialAccountResolution =
  | { status: "MATCHED"; account: FinancialAccountForAi }
  | { status: "AMBIGUOUS"; candidates: FinancialAccountForAi[] }
  | { status: "NOT_FOUND"; candidates: FinancialAccountForAi[] };

const GENERIC_CARD_NAMES = new Set([
  "",
  "cartao",
  "cartao de credito",
  "credito",
  "meu cartao",
  "meu cartao de credito",
]);

const ACCOUNT_NAME_STOP_WORDS = new Set([
  "a",
  "ao",
  "banco",
  "cartao",
  "conta",
  "credito",
  "da",
  "de",
  "do",
  "em",
  "meu",
  "minha",
  "na",
  "no",
]);

const KNOWN_CARD_ALIASES: Record<string, string> = {
  roxinho: "nubank",
  roxinha: "nubank",
  laranjinha: "inter",
};

export function normalizeFinancialAccountName(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function canonicalAccountName(value: string | null | undefined) {
  const normalized = normalizeFinancialAccountName(value);
  const alias = KNOWN_CARD_ALIASES[normalized];
  if (alias) return alias;

  const relevantWords = normalized
    .split(" ")
    .filter((word) => word && !ACCOUNT_NAME_STOP_WORDS.has(word));

  const cleaned = relevantWords.join(" ");
  return KNOWN_CARD_ALIASES[cleaned] || cleaned;
}

export function resolveFinancialAccount(
  requestedName: string | null | undefined,
  accounts: FinancialAccountForAi[],
  options: { creditCardsOnly?: boolean } = {},
): FinancialAccountResolution {
  const candidates = options.creditCardsOnly
    ? accounts.filter((account) => account.type === "CREDIT_CARD")
    : accounts;

  if (candidates.length === 0) {
    return { status: "NOT_FOUND", candidates: [] };
  }

  const normalizedRequest = normalizeFinancialAccountName(requestedName);
  const canonicalRequest = canonicalAccountName(requestedName);
  const isGenericCardName = GENERIC_CARD_NAMES.has(normalizedRequest)
    || (options.creditCardsOnly && !canonicalRequest);

  if (isGenericCardName) {
    return candidates.length === 1
      ? { status: "MATCHED", account: candidates[0] }
      : { status: "AMBIGUOUS", candidates };
  }

  const exactMatches = candidates.filter(
    (account) => canonicalAccountName(account.name) === canonicalRequest,
  );
  if (exactMatches.length === 1) {
    return { status: "MATCHED", account: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return { status: "AMBIGUOUS", candidates: exactMatches };
  }

  const partialMatches = candidates.filter((account) => {
    const candidateName = canonicalAccountName(account.name);
    return candidateName.includes(canonicalRequest)
      || canonicalRequest.includes(candidateName);
  });

  if (partialMatches.length === 1) {
    return { status: "MATCHED", account: partialMatches[0] };
  }
  if (partialMatches.length > 1) {
    return { status: "AMBIGUOUS", candidates: partialMatches };
  }

  return { status: "NOT_FOUND", candidates };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function accountTypeLabel(type: FinancialAccountAiType) {
  const labels: Record<FinancialAccountAiType, string> = {
    CHECKING: "conta corrente",
    SAVINGS: "poupança",
    CASH: "dinheiro",
    CREDIT_CARD: "cartão de crédito",
    INVESTMENT: "investimento",
    OTHER: "outra conta",
  };
  return labels[type];
}

export function formatFinancialAccountsForAi(
  accounts: FinancialAccountForAi[],
  expenseThisMonthByAccountId: ReadonlyMap<string, number>,
) {
  if (accounts.length === 0) {
    return "Nenhuma conta financeira ou cartão cadastrado.";
  }

  return accounts.map((account) => {
    const details = [
      `Nome exato: ${account.name}`,
      `Tipo: ${accountTypeLabel(account.type)}`,
    ];

    if (account.type === "CREDIT_CARD") {
      details.push(
        account.creditLimit === null
          ? "Limite: não cadastrado"
          : `Limite cadastrado: ${formatMoney(account.creditLimit)}`,
        account.closingDay === null
          ? "Fechamento: não cadastrado"
          : `Fechamento: dia ${account.closingDay}`,
        account.dueDay === null
          ? "Vencimento: não cadastrado"
          : `Vencimento: dia ${account.dueDay}`,
        `Compras registradas neste mês: ${formatMoney(expenseThisMonthByAccountId.get(account.id) || 0)}`,
      );
    }

    return `- ${details.join(" | ")}`;
  }).join("\n");
}

export function buildAccountClarificationMessage(
  candidates: FinancialAccountForAi[],
  label = "cartão",
) {
  if (candidates.length === 0) {
    return `Não encontrei nenhum ${label} ativo no seu Pila. Cadastre um no painel e tente novamente.`;
  }

  const names = candidates.map((candidate) => candidate.name).join(" ou ");
  return `Qual ${label} você quis dizer: ${names}?`;
}

export function buildCardQueryReply(
  query: CardQuery,
  card: FinancialAccountForAi,
  expensesRegisteredThisMonth: number,
) {
  if (query === "CLOSING_DAY") {
    return card.closingDay === null
      ? `O cartão ${card.name} ainda não tem dia de fechamento cadastrado.`
      : `A fatura do cartão ${card.name} fecha no dia ${card.closingDay}.`;
  }

  if (query === "DUE_DAY") {
    return card.dueDay === null
      ? `O cartão ${card.name} ainda não tem dia de vencimento cadastrado.`
      : `A fatura do cartão ${card.name} vence no dia ${card.dueDay}.`;
  }

  if (query === "CURRENT_INVOICE") {
    return `A estimativa da fatura do cartão ${card.name} é ${formatMoney(expensesRegisteredThisMonth)}, considerando as compras registradas no Pila neste mês.`;
  }

  if (card.creditLimit === null) {
    return `O cartão ${card.name} ainda não tem limite cadastrado, então não consigo calcular o disponível.`;
  }

  const estimatedAvailable = card.creditLimit - expensesRegisteredThisMonth;
  if (estimatedAvailable < 0) {
    return `Pelos registros deste mês, o cartão ${card.name} ultrapassou o limite cadastrado em ${formatMoney(Math.abs(estimatedAvailable))}. Essa é uma estimativa e não substitui a fatura do banco.`;
  }

  return `O limite disponível estimado do cartão ${card.name} é ${formatMoney(estimatedAvailable)}. Considerei o limite cadastrado menos as compras registradas neste mês; confira a fatura do banco para o valor oficial.`;
}
