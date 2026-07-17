import sharp from "sharp";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, character => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character] || character);
}

export async function generateExpenseChart(items: Array<{ label: string; value: number }>) {
  const max = Math.max(...items.map(item => item.value), 1);
  const rows = items.slice(0, 8).map((item, index) => {
    const y = 85 + index * 54;
    const width = Math.max(4, Math.round((item.value / max) * 360));
    return `<text x="36" y="${y}" fill="#d8e0e9" font-size="17">${escapeXml(item.label.slice(0, 24))}</text>
      <rect x="235" y="${y - 20}" width="${width}" height="26" rx="8" fill="#35e6a1"/>
      <text x="${Math.min(610, 245 + width)}" y="${y}" fill="#ffffff" font-size="16">R$ ${item.value.toFixed(2).replace(".", ",")}</text>`;
  }).join("\n");
  const svg = `<svg width="720" height="560" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="560" rx="24" fill="#0d1420"/>
    <text x="36" y="46" fill="#ffffff" font-size="25" font-weight="bold">Gastos por categoria</text>
    ${rows}
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
