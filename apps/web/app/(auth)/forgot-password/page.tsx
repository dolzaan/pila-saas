"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><div className="auth-bg" aria-hidden="true" /><div className="auth-card">
    <h1 className="auth-title">Recuperar senha</h1>
    <p className="auth-subtitle">Enviaremos um link seguro se o e-mail estiver cadastrado.</p>
    {sent ? <div className="form-error" role="status">Confira sua caixa de entrada e também o spam.</div> :
      <form className="auth-form" onSubmit={submit}>
        <div className="form-group"><label className="form-label" htmlFor="email">E-mail</label>
          <input className="form-input" id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <button className="btn-primary" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</button>
      </form>}
    <p className="auth-footer"><Link className="auth-link" href="/login">Voltar ao login</Link></p>
  </div></main>;
}
