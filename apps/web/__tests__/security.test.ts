import { describe, expect, it } from "vitest";
import {
  ChangePasswordSchema,
  StrongPasswordSchema,
  passwordRequirementStatus,
} from "@/lib/security";

describe("security password rules", () => {
  it("aceita uma senha forte", () => {
    expect(StrongPasswordSchema.safeParse("Pila@2026segura").success).toBe(true);
  });

  it("rejeita senhas sem os fatores exigidos", () => {
    expect(StrongPasswordSchema.safeParse("somenteletras").success).toBe(false);
    expect(StrongPasswordSchema.safeParse("SOMENTE123").success).toBe(false);
    expect(StrongPasswordSchema.safeParse("Pila2026").success).toBe(false);
  });

  it("exige confirmação idêntica", () => {
    expect(
      ChangePasswordSchema.safeParse({
        currentPassword: "Atual@123",
        newPassword: "Nova@Senha123",
        confirmPassword: "Outra@Senha123",
      }).success,
    ).toBe(false);
  });

  it("expõe o progresso dos requisitos sem armazenar a senha", () => {
    expect(passwordRequirementStatus("Pila@2026")).toEqual({
      length: true,
      uppercase: true,
      lowercase: true,
      number: true,
      special: true,
    });
  });
});
