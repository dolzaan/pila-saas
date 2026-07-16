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
  categoryId: z.string().cuid("Categoria inválida").optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(50, "Nome muito longo"),
  icon: z.string().min(1, "Ícone é obrigatório"),
  kind: z.enum(["EXPENSE", "INCOME"]),
});
