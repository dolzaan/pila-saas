import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { SubscriptionManager } from "./subscription-manager";
import { GdprClient } from "./gdpr-client";
import { TelegramConnectionCard } from "./telegram-connection-card";
import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import { SubscribeButton } from "./subscribe-button";
import { isStripeSubscriptionId } from "@/lib/stripe-subscription";

export const metadata: Metadata = {
  title: "Configurações — Pila",
};

const billingDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
      accounts: {
        where: { provider: "telegram" },
        select: { token_type: true },
        take: 1,
      },
    },
  });

  if (!user) redirect("/login");

  const subscription = getUserSubscriptionStatus(user.createdAt, user.subscription);
  const isPro = hasProAccess(subscription);
  const isTrial = subscription.status === "TRIALING";
  const hasStripeSubscription = isStripeSubscriptionId(
    user.subscription?.stripeSubscriptionId,
  );
  const nextBillingDate =
    !isTrial && hasStripeSubscription && user.subscription?.currentPeriodEnd
      ? user.subscription.currentPeriodEnd
      : null;
  const telegramAccount = user.accounts[0] || null;

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <section id="profile" className="section-card scroll-mt-28">
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Perfil
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Seus dados</h2>
          <p className="mt-1 text-sm text-slate-500">
            Informações usadas para identificar sua conta no Pila.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Nome</label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white">
              {user.name || "Usuário"}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">E-mail</label>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-white">
              {user.email}
            </div>
          </div>
        </div>
      </section>

      <section id="subscription" className="section-card scroll-mt-28">
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Assinatura
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">Plano atual</h2>
        </div>

        {isPro ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-900/20 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-emerald-400" />
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Pila Pro</h3>
                <p className="text-sm text-gray-400">
                  {isTrial
                    ? `Teste gratuito — ${subscription.daysLeft} ${subscription.daysLeft === 1 ? "dia restante" : "dias restantes"}`
                    : "Assinatura ativa"}
                </p>
              </div>
            </div>
            <p className={nextBillingDate ? "mb-4 text-gray-300" : "mb-6 text-gray-300"}>
              {isTrial
                ? "Durante o teste, você tem acesso completo ao Pila Pro, incluindo a inteligência artificial pelo WhatsApp e Telegram."
                : "Obrigado por apoiar o Pila! Você tem acesso ilimitado à inteligência artificial pelo WhatsApp e Telegram."}
            </p>
            {nextBillingDate ? (
              <div className="mb-6 rounded-xl border border-emerald-400/20 bg-black/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300/80">
                  Próximo vencimento
                </p>
                <time
                  dateTime={nextBillingDate.toISOString()}
                  className="mt-1 block text-base font-semibold text-white"
                >
                  {billingDateFormatter.format(nextBillingDate)}
                </time>
              </div>
            ) : null}
            {isTrial || !hasStripeSubscription ? (
              <SubscribeButton label="Assinar por R$ 19,90/mês" />
            ) : (
              <SubscriptionManager />
            )}
          </div>
        ) : (
          <UpgradeCard
            title="Seja Pila Pro"
            description="Assine para liberar a IA pelo WhatsApp e Telegram e não ter limites na plataforma."
          />
        )}
      </section>

      <TelegramConnectionCard
        connected={Boolean(telegramAccount)}
        connectedUsername={telegramAccount?.token_type}
      />

      <section id="privacy" className="section-card scroll-mt-28 md:col-span-2">
        <div className="mb-6 max-w-2xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Privacidade
          </span>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Privacidade e dados (LGPD)
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Seus dados pertencem a você. Exporte uma cópia completa das suas
            informações ou exclua sua conta permanentemente quando desejar.
          </p>
        </div>
        <GdprClient />
      </section>
    </div>
  );
}
