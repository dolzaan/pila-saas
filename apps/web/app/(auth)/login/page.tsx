"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await signIn("google", { redirectTo: "/dashboard" });
    } catch {
      setError("Não foi possível iniciar o login com Google. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-bg" aria-hidden="true" />

      <div className="auth-card">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2 mb-6">
          <Image src="/logo-icon.png" alt="Pila Icon" width={64} height={64} className="drop-shadow-xl" />
          <Image src="/logo-text.png" alt="Pila" width={100} height={40} className="drop-shadow-xl" />
        </div>

        <h1 className="auth-title">Bem-vindo de volta</h1>
        <p className="auth-subtitle">
          Controle suas finanças direto pelo WhatsApp
        </p>

        {/* Google OAuth */}
        <button
          id="btn-google-signin"
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
        >
          <svg className="btn-google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continuar com Google
        </button>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        {/* Form e-mail + senha */}
        <form id="form-login" onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <Link href="/forgot-password" className="auth-link">Esqueci minha senha</Link>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button
            id="btn-login"
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" aria-hidden="true" />
                Entrando...
              </span>
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <p className="auth-footer">
          Não tem conta?{" "}
          <Link href="/register" className="auth-link">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
