import { Prisma, PrismaClient } from "@prisma/client";
import { getTelegramUserRoutingContext } from "@/lib/telegram-user-routing";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  telegramRoutingMiddlewareApplied: boolean | undefined;
};

/**
 * Singleton do Prisma client.
 * Em desenvolvimento, evita criar uma nova conexão a cada hot-reload do Next.js.
 * Em produção, cria uma única instância por processo.
 */
const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

const telegramRoutingMiddleware: Prisma.Middleware = async (params, next) => {
  const context = getTelegramUserRoutingContext();
  const where = params.args?.where as { whatsappNumber?: unknown } | undefined;

  if (
    context
    && params.model === "User"
    && params.action === "findFirst"
    && where?.whatsappNumber === context.routingPhone
  ) {
    params.args = {
      ...params.args,
      where: { id: context.userId },
    };
  }

  return next(params);
};

if (!globalForPrisma.telegramRoutingMiddlewareApplied) {
  prismaClient.$use(telegramRoutingMiddleware);
  globalForPrisma.telegramRoutingMiddlewareApplied = true;
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
