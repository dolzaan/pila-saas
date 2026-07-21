import { AsyncLocalStorage } from "node:async_hooks";

type TelegramUserRoutingContext = {
  userId: string;
  routingPhone: string;
};

const telegramUserRoutingStorage = new AsyncLocalStorage<TelegramUserRoutingContext>();

export function runWithTelegramUserRouting<T>(
  userId: string,
  routingPhone: string,
  operation: () => Promise<T>,
): Promise<T> {
  return telegramUserRoutingStorage.run({ userId, routingPhone }, operation);
}

export function getTelegramUserRoutingContext() {
  return telegramUserRoutingStorage.getStore() || null;
}
