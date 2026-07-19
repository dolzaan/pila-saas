import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha muito curta").max(128, "Senha muito longa"),
});

export const WhatsappLinkCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
});

export const TransactionSchema = z.object({
  amount: z.number().positive("Valor deve ser positivo"),
  kind: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().max(255).optional(),
  categoryId: z
    .string()
    .trim()
    .min(1, "Categoria inválida")
    .max(191, "Categoria inválida")
    .optional()
    .nullable(),
  financialAccountId: z
    .string()
    .trim()
    .min(1, "Conta inválida")
    .max(191, "Conta inválida")
    .optional()
    .nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(50, "Nome muito longo"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  kind: z.enum(["EXPENSE", "INCOME"]),
});

export const FinancialAccountSchema = z
  .object({
    name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
    type: z.enum(["CHECKING", "SAVINGS", "CASH", "CREDIT_CARD", "INVESTMENT", "OTHER"]),
    initialBalance: z.number().finite().min(-1_000_000_000).max(1_000_000_000),
    creditLimit: z.number().finite().positive("O limite deve ser positivo").max(1_000_000_000).optional(),
    closingDay: z.number().int().min(1).max(31).optional(),
    dueDay: z.number().int().min(1).max(31).optional(),
  })
  .superRefine((data, context) => {
    if (data.type !== "CREDIT_CARD") return;

    if (!data.creditLimit) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditLimit"],
        message: "Informe o limite do cartão",
      });
    }
    if (!data.closingDay) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closingDay"],
        message: "Informe o dia de fechamento",
      });
    }
    if (!data.dueDay) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDay"],
        message: "Informe o dia de vencimento",
      });
    }
  });
