export type ReminderItem = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAt: string | null;
  snoozedUntil: string | null;
  lastNotifiedAt: string | null;
  notificationCount: number;
};
