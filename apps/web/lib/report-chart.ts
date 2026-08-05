import * as echarts from "echarts";
import type { EChartsOption, TitleComponentOption } from "echarts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProfessionalReport, ReportKpi } from "@/lib/report-engine";
import { REPORT_FONT_BASE64 } from "@/lib/report-font";

const WIDTH = 1080;
const HEIGHT = 1350;
const COLORS = ["#35e6a1", "#7c83ff", "#ff6b7a", "#ffbd59", "#4cc9f0", "#b497cf"];
const REPORT_FONT_FAMILY = "DejaVu Sans";

let reportFontPrepared = false;

function prepareReportFont() {
  if (reportFontPrepared) return;

  const fontDirectory = join(tmpdir(), "pila-report-font-v1");
  const fontPath = join(fontDirectory, "DejaVuSans.ttf");
  const fontConfigPath = join(fontDirectory, "fonts.conf");

  mkdirSync(fontDirectory, { recursive: true });

  if (!existsSync(fontPath)) {
    writeFileSync(fontPath, Buffer.from(REPORT_FONT_BASE64, "base64"));
  }

  if (!existsSync(fontConfigPath)) {
    writeFileSync(
      fontConfigPath,
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontDirectory}</dir>
  <cachedir>${join(fontDirectory, "cache")}</cachedir>
  <config><rescan><int>0</int></rescan></config>
</fontconfig>`,
      "utf8",
    );
  }

  // sharp/librsvg uses Fontconfig when rasterizing the SVG. Vercel's runtime
  // does not guarantee that any system font is installed, so point it to the
  // font bundled with the report generator before sharp is loaded.
  process.env.FONTCONFIG_FILE = fontConfigPath;
  process.env.FONTCONFIG_PATH = fontDirectory;
  reportFontPrepared = true;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatKpi(kpi: ReportKpi) {
  if (kpi.format === "CURRENCY") return money(kpi.value);
  if (kpi.format === "PERCENT") return `${kpi.value.toFixed(1).replace(".", ",")}%`;
  return new Intl.NumberFormat("pt-BR").format(kpi.value);
}

function titleCards(report: ProfessionalReport): TitleComponentOption[] {
  const cards = report.kpis.slice(0, 3).map((kpi, index): TitleComponentOption => ({
    text: formatKpi(kpi),
    subtext: kpi.label.toUpperCase(),
    left: 48 + index * 338,
    top: 142,
    itemGap: 7,
    padding: [22, 22, 20, 22],
    backgroundColor: index === 0 ? "#122b26" : "#122033",
    borderColor: index === 0 ? "#225b49" : "#203148",
    borderWidth: 1,
    borderRadius: 14,
    textStyle: {
      color: index === 0 ? "#62edb8" : "#f5f8fb",
      fontFamily: REPORT_FONT_FAMILY,
      fontSize: 23,
      fontWeight: 700,
      width: 244,
      overflow: "truncate",
    },
    subtextStyle: {
      color: "#8291a5",
      fontFamily: REPORT_FONT_FAMILY,
      fontSize: 11,
      fontWeight: 700,
    },
  }));

  return [
    {
      text: report.title,
      subtext: report.subtitle,
      left: 48,
      top: 42,
      itemGap: 10,
      textStyle: {
        color: "#ffffff",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 34,
        fontWeight: 800,
      },
      subtextStyle: {
        color: "#8fa0b4",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 16,
      },
    },
    ...cards,
    {
      text: report.insights.length > 0 ? "LEITURA DO PILA" : "RELATÓRIO DO PILA",
      subtext: report.insights.length > 0
        ? report.insights.slice(0, 3).map((item) => `- ${item}`).join("\n")
        : "Os valores deste relatório foram calculados com os dados registrados na sua conta.",
      left: 48,
      top: 1090,
      itemGap: 12,
      padding: [20, 24],
      backgroundColor: "#101c2b",
      borderColor: "#1e3045",
      borderWidth: 1,
      borderRadius: 14,
      textStyle: {
        color: "#62edb8",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 12,
        fontWeight: 800,
      },
      subtextStyle: {
        color: "#c5d0dc",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 15,
        lineHeight: 25,
        width: 920,
        overflow: "break",
      },
    },
    {
      text: "PILA  |  SUA IA FINANCEIRA",
      subtext: "Relatório gerado com os dados da sua conta",
      left: 48,
      top: 1284,
      itemGap: 5,
      textStyle: {
        color: "#35e6a1",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 11,
        fontWeight: 800,
      },
      subtextStyle: {
        color: "#56677b",
        fontFamily: REPORT_FONT_FAMILY,
        fontSize: 10,
      },
    },
  ];
}

function axisStyle() {
  return {
    axisLine: { lineStyle: { color: "#314156" } },
    axisTick: { show: false },
    axisLabel: {
      color: "#91a0b2",
      fontFamily: REPORT_FONT_FAMILY,
      fontSize: 12,
    },
    splitLine: { lineStyle: { color: "rgba(145,160,178,0.13)", type: "dashed" as const } },
  };
}

function chartOption(report: ProfessionalReport): EChartsOption {
  const common: EChartsOption = {
    backgroundColor: "#08111f",
    animation: false,
    title: titleCards(report),
    aria: { enabled: true, decal: { show: false } },
    textStyle: { fontFamily: REPORT_FONT_FAMILY },
    color: report.series.map((series, index) => series.color || COLORS[index % COLORS.length]),
  };

  if (report.chartType === "DONUT") {
    const values = report.series[0]?.values || [];
    return {
      ...common,
      color: report.labels.map((_, index) => COLORS[index % COLORS.length]),
      legend: {
        type: "plain",
        top: 302,
        left: "center",
        width: 930,
        itemGap: 18,
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: "#aab8c7", fontSize: 12 },
      },
      series: [{
        name: report.series[0]?.name || "Valores",
        type: "pie",
        radius: [150, 270],
        center: ["50%", 700],
        avoidLabelOverlap: true,
        minAngle: 3,
        itemStyle: { borderColor: "#08111f", borderWidth: 5, borderRadius: 8 },
        label: {
          show: true,
          color: "#dbe5ef",
          fontSize: 13,
          lineHeight: 19,
          formatter: "{b}\n{d}%",
        },
        labelLine: { length: 20, length2: 16, lineStyle: { color: "#607086" } },
        data: report.labels.map((label, index) => ({ name: label, value: values[index] || 0 })),
      }],
    };
  }

  if (report.chartType === "LINE" || report.chartType === "AREA") {
    return {
      ...common,
      grid: { left: 92, right: 54, top: 330, bottom: 300, containLabel: true },
      legend: {
        top: 286,
        right: 48,
        textStyle: { color: "#aab8c7", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: report.labels,
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, rotate: report.labels.length > 10 ? 32 : 0 },
      },
      yAxis: {
        type: "value",
        ...axisStyle(),
        axisLabel: { ...axisStyle().axisLabel, formatter: (value: number) => compactMoney(value) },
      },
      series: report.series.map((series, index) => ({
        name: series.name,
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 4 },
        itemStyle: { color: series.color || COLORS[index % COLORS.length] },
        areaStyle: report.chartType === "AREA"
          ? { opacity: index === 0 ? 0.22 : 0.1 }
          : undefined,
        data: series.values,
      })),
    };
  }

  const horizontal = report.labels.some((label) => label.length > 12) || report.labels.length > 7;
  const stacked = report.chartType === "STACKED_BAR";
  const categoryAxis = {
    type: "category" as const,
    data: report.labels,
    ...axisStyle(),
    axisLabel: {
      ...axisStyle().axisLabel,
      interval: 0,
      width: horizontal ? 170 : 90,
      overflow: "truncate" as const,
      rotate: !horizontal && report.labels.length > 7 ? 30 : 0,
    },
  };
  const valueAxis = {
    type: "value" as const,
    ...axisStyle(),
    axisLabel: { ...axisStyle().axisLabel, formatter: (value: number) => compactMoney(value) },
  };

  return {
    ...common,
    grid: { left: horizontal ? 54 : 88, right: 54, top: 340, bottom: 300, containLabel: true },
    legend: {
      top: 286,
      right: 48,
      textStyle: { color: "#aab8c7", fontSize: 12 },
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series: report.series.map((series, index) => ({
      name: series.name,
      type: "bar",
      stack: stacked ? "total" : undefined,
      barMaxWidth: horizontal ? 32 : 46,
      itemStyle: {
        color: series.color || COLORS[index % COLORS.length],
        borderRadius: horizontal ? [0, 7, 7, 0] : [7, 7, 0, 0],
      },
      label: report.labels.length <= 8 && report.series.length === 1
        ? {
            show: true,
            position: horizontal ? "right" : "top",
            color: "#cbd6e2",
            fontSize: 11,
            formatter: "{c}",
          }
        : undefined,
      data: series.values,
    })),
  };
}

export async function generateProfessionalReportChart(report: ProfessionalReport) {
  prepareReportFont();
  const { default: sharp } = await import("sharp");
  const chart = echarts.init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: WIDTH,
    height: HEIGHT,
  });

  try {
    chart.setOption(chartOption(report));
    const svg = chart.renderToSVGString();
    const png = await sharp(Buffer.from(svg))
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } finally {
    chart.dispose();
  }
}

type LegacyChartOptions = {
  title?: string;
  totalLabel?: string;
  totalValue?: number;
  preserveOrder?: boolean;
};

export async function generateExpenseChart(
  items: Array<{ label: string; value: number }>,
  options: LegacyChartOptions = {},
) {
  const sorted = options.preserveOrder
    ? items
    : [...items].sort((left, right) => right.value - left.value);
  const total = options.totalValue ?? sorted.reduce((sum, item) => sum + item.value, 0);
  return generateProfessionalReportChart({
    title: options.title || "Gastos por categoria",
    subtitle: "Relatório financeiro",
    chartType: "BAR",
    labels: sorted.map((item) => item.label),
    series: [{ name: "Valor", values: sorted.map((item) => item.value), color: "#35e6a1" }],
    kpis: [
      { label: options.totalLabel || "Total", value: total, format: "CURRENCY" },
      { label: "Itens", value: sorted.length, format: "NUMBER" },
      { label: "Maior valor", value: sorted[0]?.value || 0, format: "CURRENCY" },
    ],
    insights: sorted[0] ? [`${sorted[0].label} foi o maior valor do relatório.`] : [],
    summary: `${options.title || "Relatório"}: ${money(total)}`,
  });
}
