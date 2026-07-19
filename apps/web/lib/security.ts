import { z } from "zod";

export const StrongPasswordSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula")
  .regex(/[a-z]/, "Inclua uma letra minúscula")
  .regex(/[0-9]/, "Inclua um número")
  .regex(/[^A-Za-z0-9]/, "Inclua um caractere especial");

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: StrongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export function passwordRequirementStatus(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}
