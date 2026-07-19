import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SecurityEventType } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  KeyRound,
  MailCheck,
  MessageCircle,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { GoogleConnectButton } from "@/components/security/google-connect-button";
import { PasswordForm } from "@/components/security/password-form";
import { SessionControls } from "@/components/security/session-controls";

export const metadata: Metadata = {
  title: "Central de segurança — Pila",
  description: "Proteja seu acesso e acompanhe eventos de segurança.",
};

const EVENT_LABELS: Record<SecurityEventType, string> = {
  LOGIN: "Acesso realizado",
  PASSWORD_SET: "Senha de acesso criada",
  PASSWORD_CHANGED: "Senha alterada",
  SESSIONS_REVOKED: "Todas as sessões foram encerradas",
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  credentials: "e-mail e senha",
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
      whatsappVerifiedAt: true,
      createdAt: true,
      accounts: {
        select: { provider: true },
      },
      securityEvents: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!user) redirect("/login");

  const hasPassword = Boolean(user.passwordHash);
  const hasGoogle = user.accounts.some((account) => account.provider === "google");
  const hasVerifiedEmail = Boolean(user.emailVerified);
  const hasWhatsapp = Boolean(user.whatsappVerifiedAt);
  const checks = [
    {
      label: "E-mail confirmado",
      description: hasVerifiedEmail
        ? "Seu endereço de acesso foi verificado."
        : "Confirme o endereço usado na conta.",
      complete: hasVerifiedEmail,
      icon: MailCheck,
      action: hasVerifiedEmail ? null : (
        <Link href="/verify-email" className="text-xs font-semibold text-amber-300 hover:text-amber-200">
          Confirmar e-mail
        </Link>
      ),
    },
    {
      label: "Senha forte",
      description: hasPassword
        ? "Login por senha está disponível."
        : "Sua conta depende atualmente de um provedor externo.",
      complete: hasPassword,
      icon: KeyRound,
      action: null,
    },
    {
      label: "Google conectado",
      description: hasGoogle
        ? "Você também pode entrar usando sua conta Google."
        : "Adicione um segundo método de acesso verificado.",
      complete: hasGoogle,
      icon: UserRoundCheck,
      action: hasGoogle ? null : <GoogleConnectButton />,
    },
    {
      label: "WhatsApp verificado",
      description: hasWhatsapp
        ? "Seu canal financeiro está vinculado."
        : "Vincule o número que conversa com o Pila.",
      complete: hasWhatsapp,
      icon: MessageCircle,
      action: hasWhatsapp ? null : (
        <Link href="/dashboard/whatsapp" className="text-xs font-semibold text-amber-300 hover:text-amber-200">
          Conectar WhatsApp
        </Link>
      ),
    },
  ];
  const completedChecks = checks.filter((check) => check.complete).length;
  const protectionLabel =
    completedChecks === checks.length
      ? "Proteção completa"
      : completedChecks >= 3
        ? "Boa proteção"
        : "Proteção incompleta";

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Central de segurança</h1>
          <p className="dashboard-subtitle">
            Métodos de acesso, sessões e histórico da sua conta.
          </p>
        </div>
      </div>

      <section className="dashboard-hero mb-8" aria-labelledby="security-overview-title">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-black/10 p-3">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <span className="dashboard-kicker">Diagnóstico da conta</span>
              <h2 id="security-overview-title" className="text-2xl font-extrabold tracking-tight">
                {protectionLabel}
              </h2>
              <p className="mt-1 text-sm text-black/60">
                {completedChecks} de {checks.length} proteções configuradas
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-black/10 px-4 py-3 text-sm font-semibold">
            Conta criada em {user.createdAt.toLocaleDateString("pt-BR")}
          </div>
        </div>
      </section>

      <section className="mb-8" aria-labelledby="security-checklist-title">
        <div className="mb-4">
          <h2 id="security-checklist-title" className="text-lg font-semibold text-gray-100">
            Checklist de proteção
          </h2>
          <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {checks.map((check) => {
            const Icon = check.icon;
            return (
              <article key={check.label} className="section-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`rounded-xl p-2.5 ${
                        check.complete
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-amber-400/10 text-amber-300"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-100">{check.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">{check.description}</p>
                      {check.action && <div className="mt-3">{check.action}</div>}
                    </div>
                  </div>
                  {check.complete ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <CircleAlert className="h-5 w-5 shrink-0 text-amber-400" />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PasswordForm hasPassword={hasPassword} />
        <SessionControls />
      </div>

      <section className="section-card" aria-labelledby="security-history-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="security-history-title" className="font-semibold text-gray-100">
              Histórico de segurança
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Últimos acessos e alterações dos últimos 180 dias.
            </p>
          </div>
          <Clock3 className="h-5 w-5 text-gray-600" />
        </div>

        {user.securityEvents.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
            Os próximos acessos e alterações aparecerão aqui.
          </div>
        ) : (
          <div className="mt-5 divide-y divide-gray-800">
            {user.securityEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-300">{EVENT_LABELS[event.type]}</p>
                  {event.provider && (
                    <p className="mt-0.5 text-xs text-gray-600">
                      Via {PROVIDER_LABELS[event.provider] || event.provider}
                    </p>
                  )}
                </div>
                <time dateTime={event.createdAt.toISOString()} className="text-right text-xs text-gray-500">
                  {formatDateTime(event.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 border-t border-gray-800 pt-4 text-xs text-gray-600">
          O Pila não registra sua senha, endereço IP ou conteúdo financeiro neste histórico.
        </p>
      </section>
    </div>
  );
}
