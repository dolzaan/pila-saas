import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import ExpiredPaywall from "@/components/expired-paywall";
import DashboardNavigation from "@/components/dashboard/dashboard-navigation";
import { DashboardFeedbackProvider } from "@/components/ui/dashboard-feedback";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { createdAt: true, subscription: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const subStatus = getUserSubscriptionStatus(dbUser.createdAt, dbUser.subscription);
  const isExpired = !hasProAccess(subStatus) && session.user.role !== "ADMIN";

  return (
    <DashboardFeedbackProvider>
      <div className="dashboard-layout">
        <DashboardNavigation
        user={{
          name: session.user.name,
          email: session.user.email,
          isAdmin: session.user.role === "ADMIN",
        }}
      />

        <main id="dashboard-content" className="dashboard-main" tabIndex={-1}>
          {isExpired ? <ExpiredPaywall status={subStatus.status} /> : children}
        </main>
      </div>
    </DashboardFeedbackProvider>
  );
}
