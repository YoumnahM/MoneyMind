import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { TransactionService } from './transaction.service';
import { faIcons } from '../icons/fontawesome-icons';
import { StatCard, TopCategory, InsightItem, HealthScore } from '../model/dashboard.model';
import { FinanceTransaction } from '../model/transactions.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private transactionService: TransactionService) {}

  getStats(): Observable<StatCard[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const totalIncome = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = totalIncome - totalExpenses;
        const savedThisMonth = this.calculateSavedThisMonth(transactions);

        return [
          {
            title: 'Total Balance',
            value: this.formatCurrency(totalBalance),
            change: 'Live',
            positive: totalBalance >= 0,
            icon: faIcons.wallet,
            theme: 'blue',
          },
          {
            title: 'Income',
            value: this.formatCurrency(totalIncome),
            change: 'Live',
            positive: true,
            icon: faIcons.dashboard,
            theme: 'green',
          },
          {
            title: 'Expenses',
            value: this.formatCurrency(totalExpenses),
            change: 'Live',
            positive: false,
            icon: faIcons.transactions,
            theme: 'orange',
          },
          {
            title: 'Saved This Month',
            value: this.formatCurrency(savedThisMonth),
            change: 'Live',
            positive: savedThisMonth >= 0,
            icon: faIcons.goal,
            theme: 'purple',
          },
        ];
      }),
    );
  }

  getTopCategories(): Observable<TopCategory[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const expenses = transactions.filter((t) => t.type === 'expense');
        const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

        const categoryMap = new Map<string, number>();

        expenses.forEach((transaction) => {
          const current = categoryMap.get(transaction.category) || 0;
          categoryMap.set(transaction.category, current + transaction.amount);
        });

        return Array.from(categoryMap.entries())
          .map(([name, amount]) => ({
            name,
            rawAmount: amount,
            amount: this.formatCurrency(amount),
            progress: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
          }))
          .sort((a, b) => b.rawAmount - a.rawAmount)
          .slice(0, 4)
          .map(({ name, amount, progress }) => ({
            name,
            amount,
            progress,
          }));
      }),
    );
  }

  getInsights(): Observable<InsightItem[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const expenses = transactions.filter((t) => t.type === 'expense');
        const income = transactions.filter((t) => t.type === 'income');

        const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

        const categoryTotals = new Map<string, number>();

        expenses.forEach((transaction) => {
          const current = categoryTotals.get(transaction.category) || 0;
          categoryTotals.set(transaction.category, current + transaction.amount);
        });

        const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1]);

        const topCategory = sortedCategories[0];
        const savings = totalIncome - totalExpense;

        const insights: InsightItem[] = [];

        if (topCategory) {
          const [categoryName, categoryAmount] = topCategory;
          const percentage =
            totalExpense > 0 ? Math.round((categoryAmount / totalExpense) * 100) : 0;

          insights.push({
            title: `${categoryName} is your top spending category`,
            text: `${percentage}% of your total expenses currently go to ${categoryName.toLowerCase()}.`,
            tag: 'Trend',
          });
        }

        if (transactions.length === 0) {
          insights.push({
            title: 'No transaction data yet',
            text: 'Add a few income and expense entries to unlock dashboard insights.',
            tag: 'Start',
          });
        } else if (savings > 0) {
          insights.push({
            title: 'Savings momentum is positive',
            text: `You currently have ${this.formatCurrency(savings)} left after expenses.`,
            tag: 'Positive',
          });
        } else {
          insights.push({
            title: 'Expenses are exceeding income',
            text: `You are currently overspending by ${this.formatCurrency(Math.abs(savings))}.`,
            tag: 'Alert',
          });
        }

        if (expenses.length > 0) {
          const averageExpense = Math.round(totalExpense / expenses.length);
          insights.push({
            title: 'Average expense transaction identified',
            text: `Your average expense transaction is ${this.formatCurrency(averageExpense)}.`,
            tag: 'Pattern',
          });
        }

        return insights.slice(0, 3);
      }),
    );
  }

  getSpendingChartData(): Observable<ChartConfiguration<'line'>['data']> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const grouped = this.groupTransactionsByMonth(transactions);

        return {
          labels: grouped.labels,
          datasets: [
            {
              data: grouped.expenses,
              label: 'Expenses',
              tension: 0.4,
              fill: true,
            },
            {
              data: grouped.income,
              label: 'Income',
              tension: 0.4,
              fill: true,
            },
          ],
        };
      }),
    );
  }

  private calculateSavedThisMonth(transactions: FinanceTransaction[]): number {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const income = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return income - expenses;
  }

  private groupTransactionsByMonth(transactions: FinanceTransaction[]): {
    labels: string[];
    income: number[];
    expenses: number[];
  } {
    const groupedMap = new Map<string, { label: string; income: number; expenses: number }>();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short' });

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          label,
          income: 0,
          expenses: 0,
        });
      }

      const current = groupedMap.get(key)!;

      if (transaction.type === 'income') {
        current.income += transaction.amount;
      } else {
        current.expenses += transaction.amount;
      }
    });

    const sortedEntries = Array.from(groupedMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      labels: sortedEntries.map(([, value]) => value.label),
      income: sortedEntries.map(([, value]) => value.income),
      expenses: sortedEntries.map(([, value]) => value.expenses),
    };
  }

  private formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString()}`;
  }

  getHealthScore(): Observable<HealthScore> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        if (!transactions.length) {
          return {
            score: 0,
            label: 'No data yet',
            status: 'critical' as const,
          };
        }

        const incomeTransactions = transactions.filter((t) => t.type === 'income');
        const expenseTransactions = transactions.filter((t) => t.type === 'expense');

        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
        const savings = totalIncome - totalExpense;

        let score = 50;

        // 1. Savings ratio
        if (totalIncome > 0) {
          const savingsRate = savings / totalIncome;

          if (savingsRate >= 0.3) {
            score += 25;
          } else if (savingsRate >= 0.15) {
            score += 18;
          } else if (savingsRate >= 0.05) {
            score += 10;
          } else if (savingsRate < 0) {
            score -= 20;
          }
        } else {
          score -= 15;
        }

        // 2. Expense pressure
        if (totalIncome > 0) {
          const expenseRatio = totalExpense / totalIncome;

          if (expenseRatio <= 0.5) {
            score += 15;
          } else if (expenseRatio <= 0.75) {
            score += 8;
          } else if (expenseRatio <= 1) {
            score += 2;
          } else {
            score -= 15;
          }
        }

        // 3. Category concentration
        if (expenseTransactions.length > 0) {
          const categoryMap = new Map<string, number>();

          expenseTransactions.forEach((transaction) => {
            const current = categoryMap.get(transaction.category) || 0;
            categoryMap.set(transaction.category, current + transaction.amount);
          });

          const topCategoryAmount = Math.max(...Array.from(categoryMap.values()));
          const topCategoryShare = totalExpense > 0 ? topCategoryAmount / totalExpense : 0;

          if (topCategoryShare <= 0.35) {
            score += 10;
          } else if (topCategoryShare <= 0.5) {
            score += 4;
          } else {
            score -= 8;
          }
        }

        // 4. Recent activity bonus
        if (transactions.length >= 5) {
          score += 5;
        }

        // Clamp between 0 and 100
        score = Math.max(0, Math.min(100, Math.round(score)));

        let label = '';
        let status: HealthScore['status'] = 'critical';

        if (score >= 85) {
          label = 'Excellent financial balance';
          status = 'excellent';
        } else if (score >= 70) {
          label = 'Stable and improving';
          status = 'good';
        } else if (score >= 50) {
          label = 'Needs attention';
          status = 'watch';
        } else {
          label = 'High spending pressure';
          status = 'critical';
        }

        return { score, label, status };
      }),
    );
  }
}
