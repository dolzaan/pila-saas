import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { SubscriptionManager } from "./subscription-manager";
import { GdprClient } from "./gdpr-client";
import { Star } from "lucide-react";
import type { Metadata } from "next";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import { SubscribeButton } from "./subscribe-button";
import { isStripeSubscriptionId } from "@/lib/stripe-subscription";

export const metadata: Metadata = {
  title: "Configurações — Pila",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  });

  if (!user) redirect("/login");

  const subscription = getUserSubscriptionStatus(user.createdAt, user.subscription);
  const isPro = hasProAccess(subscription);
  const isTrial = subscription.status === "TRIALING";
  const hasStripeSubscription = isStripeSubscriptionId(
    user.subscription?.stripeSubscriptionId
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Configurações</h1>
          <p className="dashboard-subtitle">Sua conta e assinatura.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Card */}
        <div className="section-card">
          <h2 className="text-xl font-semibold text-white mb-4">Seu Perfil</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome</label>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white">
                {user?.name || "Usuário"}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white">
                {user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="section-card">
          <h2 className="text-xl font-semibold text-white mb-4">Plano Atual</h2>
          
          {isPro ? (
            <div className="p-6 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Star className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">Pila Pro</h3>
                  <p className="text-sm text-gray-400">
                    {isTrial
                      ? `Teste gratuito — ${subscription.daysLeft} ${subscription.daysLeft === 1 ? "dia restante" : "dias restantes"}`
                      : "Assinatura ativa"}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                {isTrial
                  ? "Durante o teste, você tem acesso completo ao Pila Pro, incluindo a inteligência artificial via WhatsApp."
                  : "Obrigado por apoiar o Pila! Você tem acesso ilimitado à inteligência artificial via WhatsApp."}
              </p>
              {isTrial || !hasStripeSubscription ? (
                <SubscribeButton label="Assinar por R$ 19,90/mês" />
              ) : (
                <SubscriptionManager />
              )}
            </div>
          ) : (
            <UpgradeCard title="Seja Pila Pro" description="Assine para liberar a IA do WhatsApp e não ter limites na plataforma." />
          )}
        </div>

        {/* GDPR Card */}
        <div className="section-card md:col-span-2 mt-4">
          <h2 className="text-xl font-semibold text-white mb-2">Privacidade e Dados (LGPD)</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">
            Acreditamos que os seus dados pertencem a você. Exporte uma cópia completa de todas as suas informações ou exclua sua conta permanentemente caso não queira mais utilizar nossos serviços.
          </p>
          <GdprClient />
        </div>
      </div>
    </div>
  );
}
