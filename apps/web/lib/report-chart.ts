import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { REPORT_FONT_BASE64 } from "@/lib/report-font";

const FONT_PATH = join(tmpdir(), "pila-report-font.ttf");
let fontPromise: Promise<string> | null = null;

function getReportFont() {
  if (!fontPromise) {
    fontPromise = writeFile(FONT_PATH, Buffer.from(REPORT_FONT_BASE64, "base64"))
      .then(() => FONT_PATH);
  }
  return fontPromise;
}

function safeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 R$.,:%+\-/()]/g, "")
    .trim();
}

function escapeMarkup(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] || character);
}

async function textImage(
  text: string,
  fontPath: string,
  options: { size: number; color: string; bold?: boolean; width?: number },
) {
  const markup = options.bold
    ? `<span weight="bold" foreground="${options.color}">${escapeMarkup(text)}</span>`
    : `<span foreground="${options.color}">${escapeMarkup(text)}</span>`;

  return sharp({
    text: {
      text: markup,
      font: `DejaVu Sans ${options.size}`,
      fontfile: fontPath,
      width: options.width,
      rgba: true,
      dpi: 96,
    },
  }).png().toBuffer();
}

function money(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export async function generateExpenseChart(
  items: Array<{ label: string; value: number }>,
) {
  const chartItems = items
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const total = chartItems.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(...chartItems.map((item) => item.value), 1);
  const height = Math.max(360, 190 + chartItems.length * 88);
  const fontPath = await getReportFont();

  const shapeRows = chartItems.map((item, index) => {
    const top = 174 + index * 88;
    const barWidth = Math.max(14, Math.round((item.value / max) * 620));
    return `
      <rect x="50" y="${top + 42}" width="620" height="18" rx="9" fill="#1b2938"/>
      <rect x="50" y="${top + 42}" width="${barWidth}" height="18" rx="9" fill="#35e6a1"/>
    `;
  }).join("\n");

  const shapes = Buffer.from(`<svg width="720" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="${height}" rx="24" fill="#0d1420"/>
    <rect x="0" y="0" width="12" height="${height}" fill="#35e6a1"/>
    <rect x="38" y="84" width="644" height="70" rx="16" fill="#152231"/>
    <circle cx="650" cy="50" r="12" fill="#35e6a1"/>
    ${shapeRows}
  </svg>`);

  const layers: Array<{ input: Buffer; left: number; top: number }> = [
    { input: shapes, left: 0, top: 0 },
    {
      input: await textImage("GASTOS POR CATEGORIA", fontPath, {
        size: 24,
        color: "#ffffff",
        bold: true,
      }),
      left: 38,
      top: 24,
    },
    {
      input: await textImage("TOTAL DO MES", fontPath, {
        size: 13,
        color: "#9baabd",
        bold: true,
      }),
      left: 58,
      top: 95,
    },
    {
      input: await textImage(money(total), fontPath, {
        size: 24,
        color: "#35e6a1",
        bold: true,
      }),
      left: 58,
      top: 116,
    },
  ];

  for (let index = 0; index < chartItems.length; index += 1) {
    const item = chartItems[index];
    const top = 174 + index * 88;
    const label = safeText(item.label).slice(0, 30) || "Sem categoria";
    const percentage = total > 0 ? (item.value / total) * 100 : 0;

    layers.push(
      {
        input: await textImage(label, fontPath, {
          size: 16,
          color: "#ffffff",
          bold: true,
          width: 360,
        }),
        left: 50,
        top,
      },
      {
        input: await textImage(money(item.value), fontPath, {
          size: 15,
          color: "#d8e0e9",
          bold: true,
        }),
        left: 465,
        top,
      },
      {
        input: await textImage(`${percentage.toFixed(1).replace(".", ",")}%`, fontPath, {
          size: 13,
          color: "#9baabd",
        }),
        left: 610,
        top,
      },
    );
  }

  if (chartItems.length === 0) {
    layers.push({
      input: await textImage("Nenhum gasto registrado neste mes", fontPath, {
        size: 18,
        color: "#d8e0e9",
        width: 580,
      }),
      left: 70,
      top: 210,
    });
  }

  const png = await sharp({
    create: {
      width: 720,
      height,
      channels: 4,
      background: { r: 13, g: 20, b: 32, alpha: 1 },
    },
  })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}
