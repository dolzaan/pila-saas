import sharp from "sharp";

export async function generateExpenseChart(
  items: Array<{ label: string; value: number }>,
) {
  const chartItems = items
    .filter((item) => Number.isFinite(item.value) && item.value >= 0)
    .slice(0, 8);

  const max = Math.max(...chartItems.map((item) => item.value), 1);
  const chartHeight = Math.max(260, 80 + chartItems.length * 58);

  const grid = [0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const x = 150 + Math.round(500 * ratio);
      return `<rect x="${x}" y="42" width="1" height="${chartHeight - 78}" fill="#263343"/>`;
    })
    .join("\n");

  const rows = chartItems
    .map((item, index) => {
      const y = 66 + index * 58;
      const width = Math.max(12, Math.round((item.value / max) * 500));
      const opacity = Math.max(0.58, 1 - index * 0.055);

      return `
        <circle cx="65" cy="${y + 17}" r="17" fill="#172334"/>
        <rect x="100" y="${y}" width="550" height="34" rx="10" fill="#172334"/>
        <rect x="100" y="${y}" width="${width}" height="34" rx="10"
          fill="#35e6a1" fill-opacity="${opacity}"/>
      `;
    })
    .join("\n");

  const emptyState = chartItems.length === 0
    ? '<rect x="100" y="108" width="520" height="34" rx="10" fill="#172334"/>'
    : "";

  const svg = `<svg width="720" height="${chartHeight}" xmlns="http://www.w3.org/2000/svg">
    <rect width="720" height="${chartHeight}" rx="24" fill="#0d1420"/>
    <rect x="36" y="24" width="180" height="8" rx="4" fill="#35e6a1"/>
    ${grid}
    ${rows}
    ${emptyState}
  </svg>`;

  const png = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();

  return `data:image/png;base64,${png.toString("base64")}`;
}
