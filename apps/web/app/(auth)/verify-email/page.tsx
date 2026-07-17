"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function requestCode() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setCodeRequested(true);
      setSuccess("Se a conta estiver pendente, o código foi enviado.");
    } catch {
      setError("Não foi possível solicitar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Código inválido ou expirado.");
        return;
      }
      setSuccess("E-mail confirmado! Agora você já pode entrar no Pila.");
      setCode("");
    } catch {
      setError("Não foi possível confirmar o código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-card">
        <div className="flex flex-col items-center justify-center gap-2 mb-6">
          <Image src="/logo-icon.png" alt="Pila Icon" width={64} height={64} />
          <Image src="/logo-text.png" alt="Pila" width={100} height={40} />
        </div>
        <h1 className="auth-title">Confirme seu e-mail</h1>
        <p className="auth-subtitle">Digite o código de 6 dígitos enviado pelo Pila.</p>

        <form onSubmit={verify} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">E-mail</label>
            <input id="email" type="email" className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={loading} />
          </div>
          {codeRequested && (
            <div className="form-group">
              <label htmlFor="code" className="form-label">Código</label>
              <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className="form-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required disabled={loading} />
            </div>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          {success && <p role="status">{success}</p>}
          {codeRequested && (
            <button type="submit" className="btn-primary" disabled={loading || code.length !== 6}>
              {loading ? "Confirmando..." : "Confirmar e-mail"}
            </button>
          )}
          <button type="button" className="btn-google" onClick={requestCode} disabled={loading || !email}>
            {codeRequested ? "Reenviar código" : "Enviar código"}
          </button>
        </form>
        <p className="auth-footer"><Link href="/login" className="auth-link">Voltar para o login</Link></p>
      </div>
    </main>
  );
}
