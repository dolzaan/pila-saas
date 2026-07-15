import { PrismaClient, TransactionKind } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES: Array<{
  name: string;
  icon: string;
  kind: TransactionKind;
}> = [
  // Despesas
  { name: "Alimentação", icon: "🍔", kind: "EXPENSE" },
  { name: "Mercado", icon: "🛒", kind: "EXPENSE" },
  { name: "Transporte", icon: "🚗", kind: "EXPENSE" },
  { name: "Moradia", icon: "🏠", kind: "EXPENSE" },
  { name: "Saúde", icon: "❤️", kind: "EXPENSE" },
  { name: "Educação", icon: "📚", kind: "EXPENSE" },
  { name: "Lazer", icon: "🎮", kind: "EXPENSE" },
  { name: "Roupas", icon: "👕", kind: "EXPENSE" },
  { name: "Assinaturas", icon: "📱", kind: "EXPENSE" },
  { name: "Viagem", icon: "✈️", kind: "EXPENSE" },
  { name: "Pets", icon: "🐾", kind: "EXPENSE" },
  { name: "Beleza", icon: "💅", kind: "EXPENSE" },
  { name: "Outros", icon: "📦", kind: "EXPENSE" },

  // Receitas
  { name: "Salário", icon: "💼", kind: "INCOME" },
  { name: "Freelance", icon: "💻", kind: "INCOME" },
  { name: "Investimentos", icon: "📈", kind: "INCOME" },
  { name: "Transferência", icon: "🔄", kind: "INCOME" },
  { name: "Outros (Receita)", icon: "💰", kind: "INCOME" },
];

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Upsert categorias padrão (userId = null)
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: null as unknown as string,
          name: category.name,
        },
      },
      update: { icon: category.icon },
      create: {
        userId: null,
        name: category.name,
        icon: category.icon,
        kind: category.kind,
      },
    });
  }

  console.log(
    `✅ ${DEFAULT_CATEGORIES.length} categorias padrão criadas/atualizadas.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
