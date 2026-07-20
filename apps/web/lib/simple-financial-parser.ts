import type { PaymentMethod, ParsedTransaction } from "@/lib/ai";

const EXPENSE_INTENT = /\b(gastei|gastamos|paguei|pagamos|comprei|compramos|passei|passamos|desembolsei)\b/i;
const INCOME_INTENT = /\b(recebi|recebemos|ganhei|ganhamos|entrou|caiu)\b/i;
const QUESTION_OR_NON_TRANSACTION = /\b(quanto|qual|quais|saldo|extrato|relat[oó]rio|gr[aá]fico|fatura|limite|me lembra|me lembre|lembrete)\b/i;

const EXPENSE_CATEGORY_RULES = [
  { category: "Mercado", description: "Mercado", pattern: /\b(mercado|supermercado|atacado|a[cç]ougue|hortifruti)\b/i },
  { category: "Alimentação", description: "Alimentação", pattern: /\b(almo[cç]o|jantar|lanche|restaurante|comida|pizza|caf[eé]|padaria|delivery|ifood)\b/i },
  { category: "Transporte", description: "Transporte", pattern: /\b(uber|99|t[aá]xi|gasolina|combust[ií]vel|posto|[oô]nibus|passagem|estacionamento|ped[aá]gio)\b/i },
  { category: "Moradia", description: "Moradia", pattern: /\b(aluguel|condom[ií]nio|moradia)\b/i },
  { category: "Contas e serviços", description: "Conta", pattern: /\b(luz|energia|[aá]gua|internet|telefone|celular|g[aá]s)\b/i },
  { category: "Saúde", description: "Saúde", pattern: /\b(farm[aá]cia|rem[eé]dio|m[eé]dico|consulta|dentista|hospital|exame)\b/i },
  { category: "Educação", description: "Educação", pattern: /\b(curso|escola|faculdade|livro|material escolar)\b/i },
  { category: "Lazer", description: "Lazer", pattern: /\b(cinema|jogo|show|bar|festa|passeio)\b/i },
  { category: "Roupas", description: "Roupas", pattern: /\b(roupa|t[eê]nis|cal[cç]a|camiseta|sapato)\b/i },
  { category: "Assinaturas", description: "Assinatura", pattern: /\b(netflix|spotify|assinatura|streaming)\b/i },
  { category: "Viagem", description: "Viagem", pattern: /\b(viagem|hotel|hospedagem|passagem a[eé]rea)\b/i },
  { category: "Pets", description: "Pet", pattern: /\b(pet|ra[cç][aã]o|veterin[aá]rio)\b/i },
  { category: "Beleza", description: "Beleza", pattern: /\b(sal[aã]o|barbeiro|cabelo|manicure|beleza)\b/i },
  { category: "Impostos e taxas", description: "Imposto ou taxa", pattern: /\b(imposto|taxa|ipva|iptu|multa)\b/i },
  { category: "Dívidas e empréstimos", description: "Dívida ou empréstimo", pattern: /\b(empr[eé]stimo|financiamento|d[ií]vida)\b/i },
  { category: "Manutenção", description: "Manutenção", pattern: /\b(manuten[cç][aã]o|conserto|reparo|mec[aâ]nico)\b/i },
  { category: "Presentes e doações", description: "Presente ou doação", pattern: /\b(presente|doa[cç][aã]o)\b/i },
] as const;

const INCOME_CATEGORY_RULES = [
  { category: "Salário", description: "Salário", pattern: /\b(sal[aá]rio|pagamento|ordenado)\b/i },
  { category: "Freelance", description: "Freelance", pattern: /\b(freela|freelance|servi[cç]o)\b/i },
  { category: "Vendas", description: "Venda", pattern: /\b(venda|vendi)\b/i },
  { category: "Investimentos", description: "Investimento", pattern: /\b(investimento|dividendo|rendimento)\b/i },
  { category: "Aluguéis", description: "Aluguel recebido", pattern: /\b(aluguel)\b/i },
  { category: "Benefícios", description: "Benefício", pattern: /\b(benef[ií]cio|vale)\b/i },
  { category: "Reembolsos", description: "Reembolso", pattern: /\b(reembolso|reembolsado)\b/i },
  { category: "Prêmios e bônus", description: "Prêmio ou bônus", pattern: /\b(pr[eê]mio|b[oô]nus|comiss[aã]o)\b/i },
  { category: "Transferência", description: "Transferência recebida", pattern: /\b(transfer[eê]ncia|ted|doc)\b/i },
] as const;

type AccountHint = {
  name: string;
  normalizedName: string;
  isCreditCard: boolean;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsNormalizedPhrase(text: string, phrase: string) {
  if (!phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
}

function parseBrazilianNumber(rawValue: string, multiplier?: string) {
  let normalized = rawValue.replace(/\s/g, "");

  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const amount = multiplier ? parsed * 1_000 : parsed;
  return amount <= 1_000_000_000 ? amount : null;
}

function extractAmount(text: string) {
  const matches = text.matchAll(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?|\d+\.\d{1,2})\s*(mil)?\s*(?:reais?|real|conto|pilas?)?/gi,
  );

  for (const match of matches) {
    const afterMatch = text.slice((match.index || 0) + match[0].length);
    if (/^\s*(?:x|vezes?)\b/i.test(afterMatch)) continue;

    const amount = parseBrazilianNumber(match[1], match[2]);
    if (amount !== null) {
      return { amount, raw: match[0] };
    }
  }

  return null;
}

function extractAccountsFromContext(userContext?: string): AccountHint[] {
  if (!userContext) return [];

  const accounts: AccountHint[] = [];
  const accountPattern = /Nome exato:\s*([^|\n]+?)\s*\|\s*Tipo:\s*([^|\n]+)/gi;

  for (const match of userContext.matchAll(accountPattern)) {
    const name = match[1].trim();
    const type = normalizeText(match[2]);
    accounts.push({
      name,
      normalizedName: normalizeText(name),
      isCreditCard: type.includes("cartao de credito"),
    });
  }

  return accounts;
}

function resolveAccountHint(text: string, userContext?: string) {
  const normalized = normalizeText(text);
  const accounts = extractAccountsFromContext(userContext);
  const explicitMatches = accounts.filter((account) =>
    account.normalizedName.length >= 2
    && containsNormalizedPhrase(normalized, account.normalizedName),
  );

  if (explicitMatches.length > 0) {
    const longestNameLength = Math.max(
      ...explicitMatches.map((account) => account.normalizedName.length),
    );
    const mostSpecificMatches = explicitMatches.filter(
      (account) => account.normalizedName.length === longestNameLength,
    );

    if (mostSpecificMatches.length === 1) {
      return { account: mostSpecificMatches[0], ambiguousCards: [] };
    }

    const matchingCards = mostSpecificMatches.filter((account) => account.isCreditCard);
    if (matchingCards.length > 1) {
      return { account: null, ambiguousCards: matchingCards };
    }
  }

  const alias = normalized.includes("roxinho") || normalized.includes("roxinha")
    ? "nubank"
    : normalized.includes("laranjinha")
      ? "inter"
      : null;
  if (alias) {
    const aliased = accounts.filter((account) =>
      account.isCreditCard && account.normalizedName.includes(alias),
    );
    if (aliased.length === 1) return { account: aliased[0], ambiguousCards: [] };
    if (aliased.length > 1) return { account: null, ambiguousCards: aliased };
  }

  if (/\b(cartao|credito)\b/.test(normalized)) {
    const cards = accounts.filter((account) => account.isCreditCard);
    if (cards.length === 1) return { account: cards[0], ambiguousCards: [] };
    if (cards.length > 1) return { account: null, ambiguousCards: cards };
  }

  return { account: null, ambiguousCards: [] };
}

function detectPaymentMethod(text: string, account: AccountHint | null): PaymentMethod | undefined {
  const normalized = normalizeText(text);
  if (/\bpix\b/.test(normalized)) return "PIX";
  if (/\b(dinheiro|especie)\b/.test(normalized)) return "CASH";
  if (/\bdebito\b/.test(normalized)) return "DEBIT_CARD";
  if (/\b(credito|cartao)\b/.test(normalized) || account?.isCreditCard) return "CREDIT_CARD";
  if (/\b(transferencia|ted|doc)\b/.test(normalized)) return "BANK_TRANSFER";
  return undefined;
}

function extractInstallments(text: string) {
  const match = text.match(/\b(?:em\s+)?(\d{1,2})\s*(?:x|vezes?)\b/i);
  if (!match) return 1;
  const installments = Number(match[1]);
  return Number.isInteger(installments) && installments >= 1 && installments <= 48
    ? installments
    : 1;
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function extractDescription(
  text: string,
  amountRaw: string,
  fallbackDescription: string,
  accountName?: string,
) {
  let cleaned = text;
  if (accountName) {
    cleaned = cleaned.replace(new RegExp(accountName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }

  cleaned = cleaned
    .replace(EXPENSE_INTENT, " ")
    .replace(INCOME_INTENT, " ")
    .replace(amountRaw, " ")
    .replace(/\b(reais?|real|conto|pilas?)\b/gi, " ")
    .replace(/\b(?:em\s+)?\d{1,2}\s*(?:x|vezes?)\b/gi, " ")
    .replace(/\b(via|pelo|pela|no|na)\s+(pix|dinheiro|d[eé]bito|cr[eé]dito|cart[aã]o)\b/gi, " ")
    .replace(/\b(pix|dinheiro|d[eé]bito|cr[eé]dito|cart[aã]o|roxinho|roxinha|laranjinha)\b/gi, " ")
    .replace(/\b(um|uma|uns|umas|por|de|do|da|em|no|na|para|com)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length > 80) return fallbackDescription;
  return titleCase(cleaned);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseSimpleFinancialMessage(
  text: string,
  userContext?: string,
): ParsedTransaction | null {
  const trimmed = text.trim();
  if (
    !trimmed
    || trimmed.endsWith("?")
    || QUESTION_OR_NON_TRANSACTION.test(trimmed)
  ) {
    return null;
  }

  const isExpense = EXPENSE_INTENT.test(trimmed);
  const isIncome = INCOME_INTENT.test(trimmed);
  if (isExpense === isIncome) return null;

  const amountMatch = extractAmount(trimmed);
  if (!amountMatch) return null;

  const kind = isIncome ? "INCOME" : "EXPENSE";
  const categoryRules = kind === "INCOME" ? INCOME_CATEGORY_RULES : EXPENSE_CATEGORY_RULES;
  const categoryRule = categoryRules.find((rule) => rule.pattern.test(trimmed));
  const categoryName = categoryRule?.category
    || (kind === "INCOME" ? "Outros (Receita)" : "Outros");

  const { account, ambiguousCards } = resolveAccountHint(trimmed, userContext);
  if (ambiguousCards.length > 1) {
    return {
      isTransaction: false,
      needsClarification: true,
      paymentMethod: "CREDIT_CARD",
      replyMessage: `Qual cartão você usou: ${ambiguousCards.map((card) => card.name).join(" ou ")}?`,
    };
  }

  const paymentMethod = detectPaymentMethod(trimmed, account);
  const installments = extractInstallments(trimmed);
  const description = extractDescription(
    trimmed,
    amountMatch.raw,
    categoryRule?.description || (kind === "INCOME" ? "Receita" : "Compra"),
    account?.name,
  );
  const accountSuffix = account ? ` no ${account.name}` : "";
  const movementLabel = kind === "INCOME" ? "Ganho" : "Gasto";

  return {
    isTransaction: true,
    amount: amountMatch.amount,
    kind,
    description,
    categoryName,
    paymentMethod,
    financialAccountName: account?.name,
    installments,
    replyMessage: `✅ ${movementLabel} de ${formatMoney(amountMatch.amount)} registrado em ${description}${accountSuffix}.`,
  };
}
