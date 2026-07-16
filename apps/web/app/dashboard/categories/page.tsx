import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CategoryForm, DeleteCategoryButton } from "@/components/categories/category-form";

export const metadata: Metadata = { title: "Categorias — Pila" };

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

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Categorias</h1>
          <p className="dashboard-subtitle">Categorias padrão e personalizadas.</p>
        </div>
        <div>
          <CategoryForm />
        </div>
      </div>
      
      <div className="space-y-8 mt-6">
        {/* Categorias Personalizadas */}
        <section>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Minhas Categorias</h2>
          {customCategories.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl text-gray-500">
              Você ainda não criou nenhuma categoria personalizada.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {customCategories.map((cat) => (
                <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-200">{cat.name}</h3>
                      <span className="text-xs text-gray-500">
                        {cat.kind === "EXPENSE" ? "Despesa" : "Receita"}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteCategoryButton id={cat.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Categorias Padrão */}
        <section>
          <h2 className="text-xl font-semibold text-gray-100 mb-4">Categorias do Sistema</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {defaultCategories.map((cat) => (
              <div key={cat.id} className="bg-gray-950 border border-gray-900 rounded-lg p-4 flex items-center gap-3 opacity-80">
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-300">{cat.name}</h3>
                  <span className="text-xs text-gray-600">
                    {cat.kind === "EXPENSE" ? "Despesa" : "Receita"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
