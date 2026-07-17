import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WhatsappClient from "./whatsapp-client";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";

export const metadata = {
  title: "WhatsApp | Pila",
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
    },
  });

  if (!user) redirect("/login");

  const subscription = getUserSubscriptionStatus(user.createdAt, user.subscription);
  const isPro = hasProAccess(subscription);

  const activeLinkCode = await prisma.whatsappLinkCode.findFirst({
    where: { 
      userId: session.user.id,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">WhatsApp</h1>
        <p className="text-gray-400">
          Vincule seu número para adicionar despesas e receitas usando linguagem natural.
        </p>
      </div>

      <div className="bg-[#0d1117] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {!isPro ? (
          <UpgradeCard blockAccess />
        ) : (
          <WhatsappClient 
            initialWhatsappNumber={user?.whatsappNumber || null}
            initialPin={activeLinkCode?.code || null}
            expiresAt={activeLinkCode?.expiresAt || null}
          />
        )}
      </div>
    </div>
  );
}
