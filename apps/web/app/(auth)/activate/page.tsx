"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ActivateAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) return setError("Link de ativação inválido.");
    if (password !== confirmation) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error || "Não foi possível ativar a conta.");

      const result = await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      });
      if (result?.error) return router.push("/login");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-card">
        <h1 className="auth-title">Ative sua conta</h1>
        <p className="auth-subtitle">Crie uma senha para acessar o painel do Pila.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password" className="form-label">Senha</label>
            <input id="password" className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmation" className="form-label">Confirme a senha</label>
            <input id="confirmation" className="form-input" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required autoComplete="new-password" />
          </div>
          <p className="form-terms">Use ao menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading || !token}>
            {loading ? "Ativando..." : "Ativar e entrar"}
          </button>
        </form>
        <p className="auth-footer"><Link href="/login" className="auth-link">Voltar para o login</Link></p>
      </div>
    </main>
  );
}

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={<main className="auth-page"><div className="auth-card">Carregando...</div></main>}>
      <ActivateAccountForm />
    </Suspense>
  );
}
