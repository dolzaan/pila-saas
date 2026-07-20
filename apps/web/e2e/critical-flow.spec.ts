import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = "e2e-financial-flow@pila.local";
const password = "PilaE2E123!";
let userId = "";

test.beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      name: "Usuário E2E",
      email,
      emailVerified: new Date(),
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  userId = user.id;

  await prisma.$executeRaw`
    INSERT INTO "user_onboarding" (
      "userId",
      "step",
      "completedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${user.id},
      3,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "step" = 3,
      "completedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
});

test.afterAll(async () => {
  if (userId) {
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
});

test("landing apresenta a proposta e o CTA principal", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Sua IA financeira\. No WhatsApp/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Testar grátis por 7 dias/i })).toBeVisible();
});

test("dashboard protegido redireciona visitantes para o login", async ({ page }) => {
  await page.goto("/dashboard/transactions");

  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Ftransactions/);
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
});

test("usuário entra e cria uma transação pelo formulário real", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 20_000 });

  await page.goto("/dashboard/transactions");
  await page.getByRole("button", { name: /Nova Transação/i }).click();
  await page.getByLabel("Valor da transação").fill("42.90");
  await page.getByLabel("Descrição").fill("Almoço E2E");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Nova Transação" })).toBeHidden({
    timeout: 15_000,
  });
  await page.reload();

  await expect(page.getByText("Almoço E2E", { exact: true })).toBeVisible();
  await expect(page.getByText(/R\$\s*42,90/)).toBeVisible();
});
