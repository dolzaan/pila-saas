"use client";

import type { ForecastPoint } from "@/lib/cash-flow-forecast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) =>
  new Date(`${value}T12:00:00.000Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

export function CashFlowChart({ data }: { data: ForecastPoint[] }) {
  return (
    <div className="h-[320px] w-full" role="img" aria-label="Projeção diária do saldo">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cashFlowBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#35e6a1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#35e6a1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#253047" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={34}
            tickFormatter={formatDate}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Saldo"]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              backgroundColor: "#101726",
              borderColor: "#334155",
              borderRadius: 12,
              color: "#f8fafc",
            }}
          />
          <ReferenceLine y={0} stroke="#fb7185" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="balance"
            name="Saldo"
            stroke="#35e6a1"
            strokeWidth={2.5}
            fill="url(#cashFlowBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
