export interface FinanceTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;

  isGoalContribution?: boolean;
  goalId?: number | null;
  goalName?: string | null;
}

export type SortOption = 'latest' | 'oldest' | 'highest' | 'lowest';

export type FinanceTransactionInput = Omit<FinanceTransaction, 'id'>;