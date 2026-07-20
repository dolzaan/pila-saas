import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth";
import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserSubscriptionStatus, hasProAccess } from "@/lib/subscription";
import ExpiredPaywall from "@/components/expired-paywall";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getUserOnboardingState } from "@/lib/onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [
    dbUser,
    pendingReminderCount,
    reminderPreview,
    onboardingState,
    transactionCount,
    financialAccountCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        createdAt: true,
        subscription: true,
        whatsappNumber: true,
        whatsappVerifiedAt: true,
      },
    }),
    prisma.billReminder.count({
      where: { userId: session.user.id, isPaid: false },
    }),
    prisma.billReminder.findMany({
      where: { userId: session.user.id, isPaid: false },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    getUserOnboardingState(session.user.id),
    prisma.transaction.count({
      where: { userId: session.user.id },
    }),
    prisma.financialAccount.count({
      where: { userId: session.user.id, isArchived: false },
    }),
  ]);

  if (!dbUser) {
    redirect("/login");
  }

  const subStatus = getUserSubscriptionStatus(dbUser.createdAt, dbUser.subscription);
  const isExpired = !hasProAccess(subStatus) && session.user.role !== "ADMIN";
  const isFirstRun = !onboardingState.completedAt && !onboardingState.skippedAt;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const reminders = reminderPreview.map((reminder) => ({
    id: reminder.id,
    description: reminder.description,
    amount: reminder.amount.toNumber(),
    dueDate: reminder.dueDate.toISOString(),
    isPaid: reminder.isPaid,
    paidAt: reminder.paidAt?.toISOString() || null,
    snoozedUntil: reminder.snoozedUntil?.toISOString() || null,
    lastNotifiedAt: reminder.lastNotifiedAt?.toISOString() || null,
    notificationCount: reminder.notificationCount,
  }));

  const signOutForm = (
    <form action={signOutAction}>
      <button
        id="btn-signout"
        type="submit"
        className="btn-signout"
        title="Sair"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Sair</span>
      </button>
    </form>
  );

  return (
    <DashboardShell
      isAdmin={session.user.role === "ADMIN"}
      userName={session.user.name}
      userEmail={session.user.email}
      signOutForm={signOutForm}
      reminders={reminders}
      pendingReminderCount={pendingReminderCount}
      onboarding={{
        initialStep: onboardingState.step,
        shouldAutoOpen: isFirstRun,
        isFirstRun,
        hasTransaction: transactionCount > 0,
        hasFinancialAccount: financialAccountCount > 0,
        whatsappLinked: Boolean(
          dbUser.whatsappNumber && dbUser.whatsappVerifiedAt,
        ),
      }}
    >
      {isExpired ? <ExpiredPaywall status={subStatus.status} /> : children}
    </DashboardShell>
  );
}
