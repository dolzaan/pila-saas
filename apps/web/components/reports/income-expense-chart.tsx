"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthlyData = {
  name: string;
  income: number;
  expense: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function IncomeExpenseChart({ data }: { data: MonthlyData[] }) {
  const monthsWithData = data.filter((item) => item.income > 0 || item.expense > 0);

  if (monthsWithData.length === 0) {
    return (
      <div className="chart-empty-state">
        <strong>Ainda não há movimentações neste período.</strong>
        <span>Quando você registrar receitas ou despesas, a comparação aparecerá aqui.</span>
      </div>
    );
  }

  const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="accessible-chart">
      <p className="chart-summary">
        No período, você recebeu <strong>{formatCurrency(totalIncome)}</strong> e gastou{" "}
        <strong>{formatCurrency(totalExpense)}</strong>. O resultado foi{" "}
        <strong>{balance >= 0 ? "positivo" : "negativo"} em {formatCurrency(Math.abs(balance))}</strong>.
      </p>

      <div className="chart-visual" aria-hidden="true">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$${value}`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "#111827",
                borderColor: "#374151",
                color: "#f3f4f6",
              }}
              itemStyle={{ fontWeight: "bold" }}
              cursor={{ fill: "#1f2937" }}
            />
            <Legend wrapperStyle={{ paddingTop: "20px" }} />
            <Bar dataKey="income" name="Receitas" fill="#35e6a1" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="expense" name="Despesas" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="chart-data-details">
        <summary>Ver dados do gráfico</summary>
        <div className="accessible-table-wrapper">
          <table className="accessible-data-table">
            <caption className="sr-only">Receitas e despesas por mês</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col">Receitas</th>
                <th scope="col">Despesas</th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {monthsWithData.map((item) => (
                <tr key={item.name}>
                  <th scope="row">{item.name}</th>
                  <td>{formatCurrency(item.income)}</td>
                  <td>{formatCurrency(item.expense)}</td>
                  <td>{formatCurrency(item.income - item.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
