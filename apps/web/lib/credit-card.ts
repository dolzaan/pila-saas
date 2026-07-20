import type { CardQuery, FinancialAccountForAi } from "@/lib/financial-account-ai";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

export type CardCycle = {
  statementDate: Date;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
};

export type InstallmentPlanItem = {
  number: number;
  count: number;
  amount: number;
  statementDate: Date;
  dueDate: Date;
  occurredAt: Date;
};

export type ParsedCardPaymentCommand = {
  matched: boolean;
  amount?: number;
  cardHint?: string;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getSaoPauloDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateAtNoonUtc(year: number, month: number, requestedDay: number) {
  const day = Math.min(Math.max(requestedDay, 1), daysInMonth(year, month));
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  return dateAtNoonUtc(targetYear, targetMonthIndex + 1, date.getUTCDate());
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dueDateForStatement(statementDate: Date, closingDay: number, dueDay: number) {
  const dueInFollowingMonth = dueDay <= closingDay;
  const base = dueInFollowingMonth ? addMonths(statementDate, 1) : statementDate;
  return dateAtNoonUtc(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    dueDay,
  );
}

export function getOpenCardCycle(
  referenceDate: Date,
  closingDay: number,
  dueDay: number,
): CardCycle {
  const parts = getSaoPauloDateParts(referenceDate);
  const closingThisMonth = dateAtNoonUtc(parts.year, parts.month, closingDay);
  const closingDayThisMonth = closingThisMonth.getUTCDate();
  const statementDate = parts.day <= closingDayThisMonth
    ? closingThisMonth
    : addMonths(closingThisMonth, 1);
  const previousStatement = addMonths(statementDate, -1);

  return {
    statementDate,
    dueDate: dueDateForStatement(statementDate, closingDay, dueDay),
    periodStart: addDays(previousStatement, 1),
    periodEnd: statementDate,
  };
}

export function getPreviousCardCycle(
  cycle: CardCycle,
  closingDay: number,
  dueDay: number,
): CardCycle {
  const statementDate = addMonths(cycle.statementDate, -1);
  const previousStatement = addMonths(statementDate, -1);
  return {
    statementDate,
    dueDate: dueDateForStatement(statementDate, closingDay, dueDay),
    periodStart: addDays(previousStatement, 1),
    periodEnd: statementDate,
  };
}

export function getCardCycleForPurchase(
  purchasedAt: Date,
  closingDay: number,
  dueDay: number,
): CardCycle {
  return getOpenCardCycle(purchasedAt, closingDay, dueDay);
}

export function splitInstallmentAmounts(totalAmount: number, count: number) {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error("O valor total da compra deve ser positivo.");
  }
  if (!Number.isSafeInteger(count) || count < 1 || count > 48) {
    throw new Error("A quantidade de parcelas deve estar entre 1 e 48.");
  }

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return Array.from({ length: count }, (_, index) =>
    (baseCents + (index < remainder ? 1 : 0)) / 100,
  );
}

export function buildInstallmentPlan(
  totalAmount: number,
  count: number,
  purchasedAt: Date,
  closingDay: number,
  dueDay: number,
): InstallmentPlanItem[] {
  const firstCycle = getCardCycleForPurchase(purchasedAt, closingDay, dueDay);
  const amounts = splitInstallmentAmounts(totalAmount, count);

  return amounts.map((amount, index) => {
    const statementDate = addMonths(firstCycle.statementDate, index);
    const dueDate = dueDateForStatement(statementDate, closingDay, dueDay);
    return {
      number: index + 1,
      count,
      amount,
      statementDate,
      dueDate,
      occurredAt: dueDate,
    };
  });
}

function parseBrazilianMoney(raw: string | undefined) {
  if (!raw) return undefined;
  const compact = raw.replace(/\s/g, "");
  const normalized = compact.includes(",")
    ? compact.replace(/\./g, "").replace(",", ".")
    : compact;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export function parseCardPaymentCommand(text: string): ParsedCardPaymentCommand {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const mentionsInvoice = /\bfatura\b/.test(normalized);
  const paymentIntent = /\b(paguei|pagar|pagamento|quite(?:i|ar)|liquidei|fatura paga)\b/.test(normalized);
  if (!mentionsInvoice || !paymentIntent) {
    return { matched: false };
  }

  const moneyMatch = text.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i)
    || text.match(/(?:paguei|quitei|liquidei|pagamento(?:\s+de)?|fatura(?:\s+de)?)\s+(?:a\s+)?(?:fatura\s+)?(?:de\s+)?([\d.]+(?:,\d{1,2})?)/i);

  return {
    matched: true,
    amount: parseBrazilianMoney(moneyMatch?.[1]),
    cardHint: text,
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function buildAdvancedCardQueryReply(input: {
  query: CardQuery;
  card: FinancialAccountForAi;
  cycle: CardCycle | null;
  invoiceTotal: number;
  invoicePaid: number;
  outstandingBalance: number;
}) {
  const { query, card, cycle, invoiceTotal, invoicePaid, outstandingBalance } = input;

  if (query === "CLOSING_DAY") {
    return cycle
      ? `A fatura atual do cartão ${card.name} fecha em ${formatDate(cycle.statementDate)}.`
      : `O cartão ${card.name} ainda não tem dia de fechamento e vencimento cadastrados.`;
  }

  if (query === "DUE_DAY") {
    return cycle
      ? `A fatura atual do cartão ${card.name} vence em ${formatDate(cycle.dueDate)}.`
      : `O cartão ${card.name} ainda não tem dia de fechamento e vencimento cadastrados.`;
  }

  if (query === "CURRENT_INVOICE") {
    if (!cycle) {
      return `Cadastre o fechamento e o vencimento do cartão ${card.name} para eu calcular a fatura corretamente.`;
    }
    const remaining = Math.max(0, invoiceTotal - invoicePaid);
    const paidSuffix = invoicePaid > 0
      ? ` Já foram registrados ${formatMoney(invoicePaid)} em pagamentos; restam ${formatMoney(remaining)}.`
      : "";
    return `A fatura do cartão ${card.name}, com fechamento em ${formatDate(cycle.statementDate)}, está em ${formatMoney(invoiceTotal)}.${paidSuffix}`;
  }

  if (card.creditLimit === null) {
    return `O cartão ${card.name} ainda não tem limite cadastrado, então não consigo calcular o disponível.`;
  }

  const available = card.creditLimit - outstandingBalance;
  if (available < 0) {
    return `Pelos registros do Pila, o cartão ${card.name} ultrapassou o limite cadastrado em ${formatMoney(Math.abs(available))}. Confira o aplicativo do banco para o valor oficial.`;
  }

  return `O limite disponível estimado do cartão ${card.name} é ${formatMoney(available)}. Considerei todas as compras ainda não compensadas por pagamentos registrados no Pila.`;
}

export function buildCardPaymentReply(input: {
  cardName: string;
  amount: number;
  statementDate: Date;
  remaining: number;
}) {
  const suffix = input.remaining > 0
    ? ` Ainda restam ${formatMoney(input.remaining)} nessa fatura.`
    : " A fatura ficou marcada como quitada no Pila.";
  return `✅ Registrei o pagamento de ${formatMoney(input.amount)} da fatura do cartão ${input.cardName}, com fechamento em ${formatDate(input.statementDate)}.${suffix}`;
}
