import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import WhatsappClient from "./whatsapp-client";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";

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
      subscription: true,
    },
  });

  const isPro = user?.subscription?.status === "ACTIVE";

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
            evolutionApiUrl={process.env.EVOLUTION_API_URL || ""}
            evolutionInstanceName={process.env.EVOLUTION_INSTANCE_NAME || ""}
          />
        )}
      </div>
    </div>
  );
}
