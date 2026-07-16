"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategorySchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

export async function createCategory(
  state: any,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  const name = formData.get("name")?.toString();
  const icon = formData.get("icon")?.toString();
  const kind = formData.get("kind")?.toString();

  const parsed = CategorySchema.safeParse({ name, icon, kind });

  if (!parsed.success) {
    return { error: "Dados inválidos.", details: parsed.error.format() };
  }

  try {
    const existing = await prisma.category.findFirst({
      where: {
        userId: session.user.id,
        name: parsed.data.name,
      },
    });

    if (existing) {
      return { error: "Já existe uma categoria com este nome." };
    }

    await prisma.category.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        icon: parsed.data.icon,
        kind: parsed.data.kind,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("[createCategory]", error);
    return { error: "Erro interno ao criar categoria." };
  }
}

export async function deleteCategory(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Não autorizado." };
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category || category.userId !== session.user.id) {
      return { error: "Categoria não encontrada ou acesso negado." };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/categories");
    return { success: true };
  } catch (error) {
    console.error("[deleteCategory]", error);
    return { error: "Erro interno ao excluir categoria." };
  }
}
