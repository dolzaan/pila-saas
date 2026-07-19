import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Category } from "@prisma/client";
import { CategoryForm, DeleteCategoryButton } from "@/components/categories/category-form";

export const metadata: Metadata = { title: "Categorias — Pila" };

type CategoryItem = Pick<Category, "id" | "name" | "icon" | "kind">;

function CategoryGroup({
  title,
  description,
  categories,
  custom = false,
}: {
  title: string;
  description: string;
  categories: CategoryItem[];
  custom?: boolean;
}) {
  return (
    <div className="section-card mb-0">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-100">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-gray-400">
          {categories.length}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma categoria neste grupo.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{category.icon}</span>
                <span className="truncate font-medium text-gray-300">{category.name}</span>
              </div>
              {custom && <DeleteCategoryButton id={category.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function CategoriesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: null }, { userId: session.user.id }],
    },
    orderBy: [
      { userId: "asc" }, // nulls first (padrão do sistema vêm primeiro)
      { name: "asc" },
    ],
  });

  const defaultCategories = categories.filter((c) => c.userId === null);
  const customCategories = categories.filter((c) => c.userId !== null);
  const systemExpenses = defaultCategories.filter((category) => category.kind === "EXPENSE");
  const systemIncomes = defaultCategories.filter((category) => category.kind === "INCOME");
  const customExpenses = customCategories.filter((category) => category.kind === "EXPENSE");
  const customIncomes = customCategories.filter((category) => category.kind === "INCOME");

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Categorias</h1>
          <p className="dashboard-subtitle">Organize seus lançamentos com categorias do Pila ou crie as suas.</p>
        </div>
        <CategoryForm />
      </div>

      <div className="mt-6 space-y-10">
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-100">Minhas categorias</h2>
            <p className="mt-1 text-sm text-gray-500">Categorias exclusivas da sua conta.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CategoryGroup
              title="Despesas"
              description="Categorias personalizadas para seus gastos."
              categories={customExpenses}
              custom
            />
            <CategoryGroup
              title="Receitas"
              description="Categorias personalizadas para seus ganhos."
              categories={customIncomes}
              custom
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-100">Categorias do sistema</h2>
            <p className="mt-1 text-sm text-gray-500">
              Catálogo oficial do Pila, disponível automaticamente para todos os usuários.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <CategoryGroup
              title="Despesas"
              description="Gastos do dia a dia, contas, lazer e obrigações."
              categories={systemExpenses}
            />
            <CategoryGroup
              title="Receitas"
              description="Entradas recorrentes, extras e rendimentos."
              categories={systemIncomes}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
