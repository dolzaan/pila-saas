"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartData = {
  name: string;
  total: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function OverviewChart({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return (
      <div className="chart-empty-state">
        <strong>Ainda não há despesas neste mês.</strong>
        <span>Registre uma despesa para começar a visualizar suas categorias.</span>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.total, 0);
  const largest = data.reduce((current, item) =>
    item.total > current.total ? item : current
  );
  const largestPercentage = total > 0 ? Math.round((largest.total / total) * 100) : 0;

  return (
    <div className="accessible-chart">
      <p className="chart-summary">
        Sua maior categoria de despesa é <strong>{largest.name}</strong>, com{" "}
        <strong>{formatCurrency(largest.total)}</strong>, representando{" "}
        <strong>{largestPercentage}%</strong> dos gastos categorizados.
      </p>

      <div className="chart-visual" aria-hidden="true">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
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
                borderColor: "#334155",
                color: "#f3f4f6",
              }}
              itemStyle={{ color: "#35e6a1" }}
            />
            <Bar dataKey="total" fill="#35e6a1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="chart-data-details">
        <summary>Ver dados do gráfico</summary>
        <div className="accessible-table-wrapper">
          <table className="accessible-data-table">
            <caption className="sr-only">Despesas do mês por categoria</caption>
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                <th scope="col">Valor</th>
                <th scope="col">Participação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.name}>
                  <th scope="row">{item.name}</th>
                  <td>{formatCurrency(item.total)}</td>
                  <td>{total > 0 ? Math.round((item.total / total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
