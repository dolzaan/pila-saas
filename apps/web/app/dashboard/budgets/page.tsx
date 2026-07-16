import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BudgetClient } from "./budget-client";
import { startOfMonth, endOfMonth } from "date-fns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orçamentos — Pila" };

export default async function BudgetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch all expense categories (system + user's)
  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: null }, { userId: session.user.id }],
      kind: "EXPENSE",
    },
    orderBy: { name: "asc" },
  });

  // Fetch user's budgets
  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id },
  });

  // Fetch current month's expenses grouped by category
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const expenses = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId: session.user.id,
      kind: "EXPENSE",
      occurredAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  // Format data for the client
  const expensesMap = new Map(
    expenses.map((e) => [e.categoryId, Number(e._sum.amount || 0)])
  );
  
  const budgetsMap = new Map(
    budgets.map((b) => [b.categoryId, Number(b.monthlyLimit)])
  );

  const budgetData = categories.map((cat) => {
    const limit = budgetsMap.get(cat.id);
    const spent = expensesMap.get(cat.id) || 0;
    const percentage = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    
    return {
      category: { id: cat.id, name: cat.name, icon: cat.icon },
      limit,
      spent,
      percentage,
    };
  });

  // Sort by percentage descending
  budgetData.sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Orçamentos</h1>
          <p className="dashboard-subtitle">Acompanhe seus limites de gastos neste mês.</p>
        </div>
      </div>

      <BudgetClient data={budgetData} />
    </div>
  );
}
