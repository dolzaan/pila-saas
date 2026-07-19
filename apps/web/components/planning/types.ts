export type FinancialGoalItem = {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string | null;
  completedAt: string | null;
};
