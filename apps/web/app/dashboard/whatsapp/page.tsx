import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WhatsappClient from "./whatsapp-client";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import { TelegramConnectionCard } from "../settings/telegram-connection-card";

export const metadata = {
  title: "Integrações | Pila",
};

export default async function WhatsappPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      whatsappNumber: true,
      whatsappVerifiedAt: true,
      createdAt: true,
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
  const telegramAccount = user.accounts[0] || null;

  const activeLinkCode = await prisma.whatsappLinkCode.findFirst({
    where: {
      userId: session.user.id,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 animate-in fade-in duration-500">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Integrações</h1>
        <p className="text-gray-400">
          Conecte WhatsApp e Telegram para registrar despesas e receitas usando linguagem natural.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-800 bg-[#0d1117] p-6 shadow-xl sm:p-8">
        {!isPro ? (
          <UpgradeCard blockAccess />
        ) : (
          <WhatsappClient
            initialWhatsappNumber={user.whatsappNumber || null}
            initialPin={activeLinkCode?.code || null}
            expiresAt={activeLinkCode?.expiresAt || null}
          />
        )}
      </div>

      <TelegramConnectionCard
        connected={Boolean(telegramAccount)}
        connectedUsername={telegramAccount?.token_type}
      />
    </div>
  );
}
