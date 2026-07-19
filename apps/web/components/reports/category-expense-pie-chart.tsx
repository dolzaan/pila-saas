"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type CategoryData = {
  name: string;
  value: number;
};

const COLORS = [
  "#fb7185",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#35e6a1",
  "#2dd4bf",
  "#38bdf8",
  "#818cf8",
  "#c084fc",
  "#f472b6",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export function CategoryExpensePieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="chart-empty-state">
        <strong>Nenhuma despesa neste período.</strong>
        <span>Os gastos categorizados serão apresentados aqui.</span>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const largest = data.reduce((current, item) =>
    item.value > current.value ? item : current
  );
  const largestPercentage = total > 0 ? Math.round((largest.value / total) * 100) : 0;

  return (
    <div className="accessible-chart">
      <p className="chart-summary">
        <strong>{largest.name}</strong> foi a maior categoria, com{" "}
        <strong>{formatCurrency(largest.value)}</strong>, equivalente a{" "}
        <strong>{largestPercentage}%</strong> das despesas.
      </p>

      <div className="chart-visual" aria-hidden="true">
        <ResponsiveContainer width="100%" height={400}>
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={130}
              dataKey="value"
              label={({ name, percent }) =>
                percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
              }
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "#111827",
                borderColor: "#374151",
                color: "#f3f4f6",
              }}
              itemStyle={{ fontWeight: "bold" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <details className="chart-data-details">
        <summary>Ver dados do gráfico</summary>
        <div className="accessible-table-wrapper">
          <table className="accessible-data-table">
            <caption className="sr-only">Despesas por categoria</caption>
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
                  <td>{formatCurrency(item.value)}</td>
                  <td>{total > 0 ? Math.round((item.value / total) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
