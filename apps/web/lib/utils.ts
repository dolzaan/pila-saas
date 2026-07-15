/**
 * Combina classes CSS condicionalmente.
 * Implementação mínima sem dependências externas.
 */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formata um valor em reais (BRL).
 * Ex: formatCurrency(1234.5) → "R$ 1.234,50"
 */
export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

/**
 * Formata uma data para exibição em pt-BR.
 * Ex: formatDate(new Date()) → "14/07/2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

/**
 * Gera um código numérico aleatório de N dígitos.
 * Usado para o código de vínculo do WhatsApp.
 */
export function generateNumericCode(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/**
 * Mascara um valor sensível para uso seguro em logs.
 * Nunca logue valores financeiros, senhas ou tokens completos.
 */
export function maskForLog(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}
