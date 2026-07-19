import { PrismaClient, type TransactionKind } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "../default-categories";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Upsert categorias padrão (userId = null)
  for (const category of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: null,
        name: category.name,
      },
    });

    if (existing) {
      await prisma.category.update({
        where: { id: existing.id },
        data: {
          icon: category.icon,
          kind: category.kind as TransactionKind,
        },
      });
    } else {
      await prisma.category.create({
        data: {
          userId: null,
          name: category.name,
          icon: category.icon,
          kind: category.kind as TransactionKind,
        },
      });
    }
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
