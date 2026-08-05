import { describe, expect, it } from "vitest";
import { generateProfessionalReportChart } from "@/lib/report-chart";

describe("professional report chart", () => {
  it("renderiza um PNG profissional no servidor", async () => {
    const dataUrl = await generateProfessionalReportChart({
      title: "Gastos por categoria",
      subtitle: "agosto de 2026",
      chartType: "DONUT",
      labels: ["Alimentação", "Moradia", "Transporte"],
      series: [{ name: "Despesas", values: [620, 1200, 280] }],
      kpis: [
        { label: "Despesas", value: 2100, format: "CURRENCY" },
        { label: "Categorias", value: 3, format: "NUMBER" },
        { label: "Maior gasto", value: 1200, format: "CURRENCY" },
      ],
      insights: ["Moradia concentrou o maior volume de gastos."],
      summary: "Resumo",
    });

    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    const png = Buffer.from(dataUrl.split(",")[1], "base64");
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.length).toBeGreaterThan(10_000);
  }, 20_000);
});
