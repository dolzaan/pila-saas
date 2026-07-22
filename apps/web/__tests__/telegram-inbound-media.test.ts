import { describe, expect, it } from "vitest";
import { selectLargestTelegramPhoto } from "@/lib/telegram-inbound-media";

describe("Telegram inbound media", () => {
  it("seleciona a maior resolução disponível para leitura da nota fiscal", () => {
    expect(selectLargestTelegramPhoto([
      { file_id: "small", width: 90, height: 120, file_size: 4_000 },
      { file_id: "medium", width: 640, height: 850, file_size: 120_000 },
      { file_id: "large", width: 1280, height: 1700, file_size: 480_000 },
    ])).toMatchObject({ file_id: "large" });
  });

  it("usa o tamanho do arquivo como desempate", () => {
    expect(selectLargestTelegramPhoto([
      { file_id: "compressed", width: 800, height: 800, file_size: 100_000 },
      { file_id: "detailed", width: 800, height: 800, file_size: 220_000 },
    ])).toMatchObject({ file_id: "detailed" });
  });

  it("retorna nulo quando a mensagem não contém fotos", () => {
    expect(selectLargestTelegramPhoto(undefined)).toBeNull();
    expect(selectLargestTelegramPhoto([])).toBeNull();
  });
});
