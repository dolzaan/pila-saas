"use client";

import { changePassword } from "@/app/actions/security";
import { passwordRequirementStatus } from "@/lib/security";
import { Check, Circle, KeyRound } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

const REQUIREMENTS = [
  { key: "length", label: "8 ou mais caracteres" },
  { key: "uppercase", label: "Uma letra maiúscula" },
  { key: "lowercase", label: "Uma letra minúscula" },
  { key: "number", label: "Um número" },
  { key: "special", label: "Um caractere especial" },
] as const;

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [newPassword, setNewPassword] = useState("");
  const [state, formAction, isPending] = useActionState(changePassword, null);
  const requirements = passwordRequirementStatus(newPassword);

  useEffect(() => {
    if (state?.success && state.signOut) {
      void signOut({ redirectTo: "/login" });
    }
  }, [state]);

  if (!hasPassword) {
    return (
      <section className="section-card" aria-labelledby="password-security-title">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-400/10 p-2.5 text-indigo-300">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 id="password-security-title" className="font-semibold text-gray-100">
              Criar senha de acesso
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Para confirmar que é você, o Pila enviará um link ao e-mail verificado da conta.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-white/5 bg-black/15 p-4">
          <p className="text-sm text-gray-300">
            Você continuará podendo entrar com Google depois de criar a senha.
          </p>
          <Link href="/forgot-password" className="app-button app-button--primary mt-4">
            Enviar link para criar senha
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-card" aria-labelledby="password-security-title">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-400/10 p-2.5 text-indigo-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 id="password-security-title" className="font-semibold text-gray-100">
            Alterar senha
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            A alteração encerra todas as sessões, inclusive esta.
          </p>
        </div>
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        {state?.error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">
            {state.error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="current-password" className="text-sm font-medium text-gray-300">
            Senha atual
          </label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="form-input"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="new-password" className="text-sm font-medium text-gray-300">
            Nova senha
          </label>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="form-input"
          />
          {state?.details?.newPassword && (
            <p className="text-xs text-red-400">
              {state.details.newPassword._errors.join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
            Confirmar nova senha
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="form-input"
          />
          {state?.details?.confirmPassword && (
            <p className="text-xs text-red-400">
              {state.details.confirmPassword._errors.join(", ")}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/5 bg-black/15 p-3 sm:grid-cols-2">
          {REQUIREMENTS.map((requirement) => {
            const complete = requirements[requirement.key];
            const Icon = complete ? Check : Circle;
            return (
              <span
                key={requirement.key}
                className={`flex items-center gap-2 text-xs ${
                  complete ? "text-emerald-300" : "text-gray-500"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {requirement.label}
              </span>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="app-button app-button--primary"
        >
          {isPending ? "Protegendo conta..." : "Alterar senha"}
        </button>
      </form>
    </section>
  );
}
