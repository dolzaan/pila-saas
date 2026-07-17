"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) return setError("As senhas não coincidem.");
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Não foi possível trocar a senha."); setLoading(false); return; }
    router.push("/login?password=reset");
  }

  return <div className="auth-card"><h1 className="auth-title">Nova senha</h1>
    <p className="auth-subtitle">Use maiúscula, minúscula, número e símbolo.</p>
    <form className="auth-form" onSubmit={submit}>
      <div className="form-group"><label className="form-label" htmlFor="password">Nova senha</label><input className="form-input" id="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></div>
      <div className="form-group"><label className="form-label" htmlFor="confirmation">Confirmar senha</label><input className="form-input" id="confirmation" type="password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
      {error && <div className="form-error">{error}</div>}
      <button className="btn-primary" disabled={loading || !token}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
    </form></div>;
}

export default function ResetPasswordPage() {
  return <main className="auth-page"><div className="auth-bg" aria-hidden="true" /><Suspense fallback={<div className="auth-card">Carregando...</div>}><ResetForm /></Suspense></main>;
}
