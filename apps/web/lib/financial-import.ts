import { createHash } from "node:crypto";

export const MAX_IMPORT_FILE_BYTES = 1_000_000;
export const MAX_IMPORT_ROWS = 500;

export type ImportedTransactionKind = "EXPENSE" | "INCOME";
export type FinancialImportFormat = "CSV" | "OFX";

export type ParsedFinancialTransaction = {
  fingerprint: string;
  occurredAt: string;
  description: string;
  amount: number;
  kind: ImportedTransactionKind;
  externalId?: string;
  sourceRow: number;
};

export type FinancialImportResult = {
  format: FinancialImportFormat;
  rows: ParsedFinancialTransaction[];
  ignoredRows: number;
};

type UnfingerprintedTransaction = Omit<ParsedFinancialTransaction, "fingerprint">;

const DATE_HEADERS = ["data", "date", "datalancamento", "datamovimento", "occurredat"];
const DESCRIPTION_HEADERS = [
  "descricao",
  "description",
  "historico",
  "history",
  "memo",
  "lancamento",
  "estabelecimento",
];
const AMOUNT_HEADERS = ["valor", "amount", "quantia"];
const DEBIT_HEADERS = ["debito", "debit", "saida", "despesa"];
const CREDIT_HEADERS = ["credito", "credit", "entrada", "receita"];
const TYPE_HEADERS = ["tipo", "type", "natureza"];
const ID_HEADERS = ["id", "fitid", "identificador", "codigo", "transactionid"];

export class FinancialImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialImportError";
  }
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function cleanDescription(value: string | undefined) {
  const description = value
    ?.replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return (description || "Importação bancária").slice(0, 255);
}

function findHeader(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(normalize(header)));
}

function parseCsvRecords(content: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && (character === ";" || character === "," || character === "\t")) {
      const delimiter = detectCsvDelimiter(content);
      if (character === delimiter) {
        record.push(field.trim());
        field = "";
        continue;
      }
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      record.push(field.trim());
      field = "";
      if (record.some(Boolean)) records.push(record);
      record = [];
      continue;
    }

    field += character;
  }

  if (quoted) {
    throw new FinancialImportError("O arquivo CSV possui aspas abertas ou está incompleto.");
  }

  record.push(field.trim());
  if (record.some(Boolean)) records.push(record);
  return records;
}

function detectCsvDelimiter(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] || "";
  const candidates = [";", ",", "\t"] as const;
  let selected: (typeof candidates)[number] = ";";
  let highestCount = -1;

  for (const candidate of candidates) {
    let count = 0;
    let quoted = false;
    for (const character of firstLine) {
      if (character === '"') quoted = !quoted;
      if (!quoted && character === candidate) count += 1;
    }
    if (count > highestCount) {
      selected = candidate;
      highestCount = count;
    }
  }

  return selected;
}

function parseMoney(value: string | undefined) {
  if (!value?.trim()) return null;

  let normalized = value
    .trim()
    .replace(/\u00a0/g, "")
    .replace(/\s/g, "")
    .replace(/R\$/gi, "");
  let negative = false;

  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    negative = true;
    normalized = normalized.slice(1, -1);
  }

  normalized = normalized.replace(/[^\d,.\-+]/g, "");
  if (normalized.startsWith("-")) negative = true;
  normalized = normalized.replace(/[+-]/g, "");

  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const decimalPlaces = normalized.length - lastDot - 1;
    if (decimalPlaces === 3) normalized = normalized.replace(/\./g, "");
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return negative ? -amount : amount;
}

function createImportDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

function parseImportDate(value: string | undefined) {
  const input = value?.trim();
  if (!input) return null;

  const iso = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return createImportDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const brazilian = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (brazilian) {
    return createImportDate(
      Number(brazilian[3]),
      Number(brazilian[2]),
      Number(brazilian[1]),
    );
  }

  const compact = input.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact) {
    return createImportDate(Number(compact[1]), Number(compact[2]), Number(compact[3]));
  }

  return null;
}

function kindFromType(value: string | undefined) {
  const type = normalize(value || "");
  if (["expense", "despesa", "debit", "debito", "saida", "d"].includes(type)) {
    return "EXPENSE" as const;
  }
  if (["income", "receita", "credit", "credito", "entrada", "c"].includes(type)) {
    return "INCOME" as const;
  }
  return null;
}

function parseCsv(content: string) {
  const records = parseCsvRecords(content.replace(/^\uFEFF/, ""));
  if (records.length < 2) {
    throw new FinancialImportError("O CSV precisa ter um cabeçalho e ao menos uma transação.");
  }

  const headers = records[0];
  const dateIndex = findHeader(headers, DATE_HEADERS);
  const descriptionIndex = findHeader(headers, DESCRIPTION_HEADERS);
  const amountIndex = findHeader(headers, AMOUNT_HEADERS);
  const debitIndex = findHeader(headers, DEBIT_HEADERS);
  const creditIndex = findHeader(headers, CREDIT_HEADERS);
  const typeIndex = findHeader(headers, TYPE_HEADERS);
  const idIndex = findHeader(headers, ID_HEADERS);

  if (dateIndex < 0) {
    throw new FinancialImportError('Não encontrei uma coluna de data no CSV.');
  }
  if (amountIndex < 0 && debitIndex < 0 && creditIndex < 0) {
    throw new FinancialImportError('Não encontrei uma coluna de valor, débito ou crédito no CSV.');
  }

  const rows: UnfingerprintedTransaction[] = [];
  let ignoredRows = 0;

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];
    const occurredAt = parseImportDate(record[dateIndex]);
    const explicitKind = typeIndex >= 0 ? kindFromType(record[typeIndex]) : null;
    const debit = debitIndex >= 0 ? parseMoney(record[debitIndex]) : null;
    const credit = creditIndex >= 0 ? parseMoney(record[creditIndex]) : null;
    const singleAmount = amountIndex >= 0 ? parseMoney(record[amountIndex]) : null;

    let signedAmount: number | null = singleAmount;
    let kind = explicitKind;

    if (credit !== null && credit !== 0) {
      signedAmount = Math.abs(credit);
      kind = "INCOME";
    } else if (debit !== null && debit !== 0) {
      signedAmount = -Math.abs(debit);
      kind = "EXPENSE";
    }

    if (!occurredAt || signedAmount === null || signedAmount === 0) {
      ignoredRows += 1;
      continue;
    }

    kind ||= signedAmount < 0 ? "EXPENSE" : "INCOME";
    rows.push({
      occurredAt,
      description: cleanDescription(
        descriptionIndex >= 0 ? record[descriptionIndex] : undefined,
      ),
      amount: Math.abs(signedAmount),
      kind,
      externalId: idIndex >= 0 ? record[idIndex]?.trim() || undefined : undefined,
      sourceRow: index + 1,
    });
  }

  return { rows, ignoredRows };
}

function readOfxTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}>\\s*([^<\\r\\n]+)`, "i"));
  return match?.[1]?.trim();
}

function parseOfx(content: string) {
  const blocks = Array.from(
    content.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi),
  );
  if (blocks.length === 0) {
    throw new FinancialImportError("Não encontrei transações válidas no arquivo OFX.");
  }

  const rows: UnfingerprintedTransaction[] = [];
  let ignoredRows = 0;

  blocks.forEach((match, index) => {
    const block = match[1];
    const occurredAt = parseImportDate(readOfxTag(block, "DTPOSTED"));
    const signedAmount = parseMoney(readOfxTag(block, "TRNAMT"));

    if (!occurredAt || signedAmount === null || signedAmount === 0) {
      ignoredRows += 1;
      return;
    }

    const name = readOfxTag(block, "NAME");
    const memo = readOfxTag(block, "MEMO");
    const description = name && memo && normalize(name) !== normalize(memo)
      ? `${name} — ${memo}`
      : name || memo;

    rows.push({
      occurredAt,
      description: cleanDescription(description),
      amount: Math.abs(signedAmount),
      kind: signedAmount < 0 ? "EXPENSE" : "INCOME",
      externalId: readOfxTag(block, "FITID"),
      sourceRow: index + 1,
    });
  });

  return { rows, ignoredRows };
}

function transactionIdentity(accountId: string, row: UnfingerprintedTransaction) {
  if (row.externalId) {
    return `${accountId}|external|${row.externalId.trim().toLowerCase()}`;
  }

  return [
    accountId,
    row.occurredAt.slice(0, 10),
    row.amount.toFixed(2),
    row.kind,
    normalize(row.description),
  ].join("|");
}

function withFingerprints(accountId: string, rows: UnfingerprintedTransaction[]) {
  const occurrences = new Map<string, number>();

  return rows.map((row) => {
    const identity = transactionIdentity(accountId, row);
    const occurrence = row.externalId ? 1 : (occurrences.get(identity) || 0) + 1;
    occurrences.set(identity, occurrence);

    return {
      ...row,
      fingerprint: createHash("sha256")
        .update(`${identity}|${occurrence}`)
        .digest("hex"),
    };
  });
}

export function parseFinancialImport(input: {
  accountId: string;
  fileName: string;
  content: string;
}): FinancialImportResult {
  if (!input.accountId.trim()) {
    throw new FinancialImportError("Selecione uma conta antes de importar.");
  }
  if (!input.content.trim()) {
    throw new FinancialImportError("O arquivo está vazio.");
  }
  if (Buffer.byteLength(input.content, "utf8") > MAX_IMPORT_FILE_BYTES) {
    throw new FinancialImportError("O arquivo deve ter no máximo 1 MB.");
  }

  const extension = input.fileName.split(".").pop()?.toLowerCase();
  const looksLikeOfx = /<OFX>|<STMTTRN>/i.test(input.content);
  const format: FinancialImportFormat =
    extension === "ofx" || extension === "qfx" || looksLikeOfx ? "OFX" : "CSV";
  const parsed = format === "OFX" ? parseOfx(input.content) : parseCsv(input.content);

  if (parsed.rows.length === 0) {
    throw new FinancialImportError("Nenhuma transação válida foi encontrada no arquivo.");
  }
  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new FinancialImportError(`O arquivo pode ter no máximo ${MAX_IMPORT_ROWS} transações.`);
  }

  return {
    format,
    rows: withFingerprints(input.accountId, parsed.rows),
    ignoredRows: parsed.ignoredRows,
  };
}
