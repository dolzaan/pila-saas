import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar — FinZap",
  description: "Faça login na sua conta FinZap para gerenciar suas finanças.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
