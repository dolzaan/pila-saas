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

    const { default: sharp } = await import("sharp");
    const { data, info } = await sharp(png)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const visibleChartColors = new Set<string>();

    for (let offset = 0; offset < data.length; offset += info.channels) {
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];

      for (const color of ["35e6a1", "7c83ff", "ff6b7a"]) {
        const expected = Buffer.from(color, "hex");
        if (
          Math.abs(red - expected[0]) <= 2
          && Math.abs(green - expected[1]) <= 2
          && Math.abs(blue - expected[2]) <= 2
        ) {
          visibleChartColors.add(color);
        }
      }
    }

    expect(visibleChartColors.size).toBeGreaterThanOrEqual(3);
  }, 20_000);
});
