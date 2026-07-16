import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportsFilter } from "@/components/reports/reports-filter";
import { IncomeExpenseChart } from "@/components/reports/income-expense-chart";
import { CategoryExpensePieChart } from "@/components/reports/category-expense-pie-chart";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

export const metadata: Metadata = { title: "Relatórios — Pila" };

export default async function ReportsPage(props: { searchParams: Promise<{ year?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const searchParams = await props.searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear;

  // Gerar anos disponíveis (ex: do ano atual - 4 até o ano atual)
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const firstDay = new Date(selectedYear, 0, 1);
  const lastDay = new Date(selectedYear, 11, 31, 23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: session.user.id,
      occurredAt: { gte: firstDay, lte: lastDay },
    },
    include: { category: true },
  });

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const monthlyData = monthNames.map(name => ({ name, income: 0, expense: 0 }));
  const categoryExpenses: Record<string, number> = {};

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const val = tx.amount.toNumber();
    const monthIndex = tx.occurredAt.getMonth();
    
    if (tx.kind === "INCOME") {
      monthlyData[monthIndex].income += val;
      totalIncome += val;
    } else {
      monthlyData[monthIndex].expense += val;
      totalExpense += val;

      const catName = tx.category ? `${tx.category.icon} ${tx.category.name}` : "Sem Categoria";
      categoryExpenses[catName] = (categoryExpenses[catName] || 0) + val;
    }
  }

  const categoryData = Object.entries(categoryExpenses)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header flex justify-between items-center">
        <div>
          <h1 className="dashboard-greeting">Relatórios</h1>
          <p className="dashboard-subtitle">Análise financeira de {selectedYear}</p>
        </div>
        <div>
          <ReportsFilter availableYears={availableYears} />
        </div>
      </div>

      <div className="stats-grid mb-8">
        <div className="stat-card stat-card--balance">
          <div className="stat-card-header">
            <span className="stat-label">Balanço do Ano</span>
            <Wallet className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="stat-value">{formatCurrency(totalIncome - totalExpense)}</div>
        </div>

        <div className="stat-card stat-card--income">
          <div className="stat-card-header">
            <span className="stat-label">Receitas Totais</span>
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="stat-value text-emerald-400">{formatCurrency(totalIncome)}</div>
        </div>

        <div className="stat-card stat-card--expense">
          <div className="stat-card-header">
            <span className="stat-label">Despesas Totais</span>
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <div className="stat-value text-red-400">{formatCurrency(totalExpense)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="section-card mb-0">
          <h2 className="section-title mb-4">Receitas x Despesas</h2>
          <IncomeExpenseChart data={monthlyData} />
        </div>

        <div className="section-card mb-0">
          <h2 className="section-title mb-4">Despesas por Categoria</h2>
          <CategoryExpensePieChart data={categoryData} />
        </div>
      </div>
    </div>
  );
}
