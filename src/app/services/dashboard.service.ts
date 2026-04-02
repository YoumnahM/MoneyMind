import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ChartConfiguration } from 'chart.js';

import { TransactionService } from './transaction.service';
import { GoalsService } from './goal.service';
import { faIcons } from '../icons/fontawesome-icons';
import { StatCard, TopCategory, InsightItem, HealthScore } from '../model/dashboard.model';
import { FinanceTransaction } from '../model/transactions.model';
import { Goal } from '../model/goals.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly goalsService: GoalsService,
  ) {}

  hasTransactions(): Observable<boolean> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => transactions.length > 0),
    );
  }

  getStats(): Observable<StatCard[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        if (!transactions.length) {
          return [];
        }

        const totalIncome = this.getTotalIncome(transactions);
        const totalExpenses = this.getTotalExpenses(transactions);
        const totalBalance = totalIncome - totalExpenses;

        const currentMonthTransactions = this.getCurrentMonthTransactions(transactions);
        const goalContributionsThisMonth = this.getGoalContributionTotal(currentMonthTransactions);

        return [
          {
            title: 'Total Balance',
            value: this.formatCurrency(totalBalance),
            change:
              totalBalance >= 0
                ? 'You have more income than expenses overall'
                : 'Your total spending is currently above your income',
            positive: totalBalance >= 0,
            icon: faIcons.wallet,
            theme: 'blue',
          },
          {
            title: 'Income',
            value: this.formatCurrency(totalIncome),
            change: 'Total income recorded so far',
            positive: true,
            icon: faIcons.dashboard,
            theme: 'green',
          },
          {
            title: 'Expenses',
            value: this.formatCurrency(totalExpenses),
            change: 'Total expenses recorded so far',
            positive: false,
            icon: faIcons.transactions,
            theme: 'orange',
          },
          {
            title: 'Goal Contributions',
            value: this.formatCurrency(goalContributionsThisMonth),
            change:
              goalContributionsThisMonth > 0
                ? 'Saved toward goals this month'
                : 'No goal-linked contributions recorded this month',
            positive: goalContributionsThisMonth > 0,
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

        if (!expenses.length || totalExpense === 0) {
          return [];
        }

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
        if (!transactions.length) {
          return [
            {
              title: 'Start tracking your money',
              text: 'Add your first transactions to unlock personalized insights about your spending and savings habits.',
              tag: 'Start',
            },
          ];
        }

        const totalIncome = this.getTotalIncome(transactions);
        const totalExpenses = this.getTotalExpenses(transactions);
        const balance = totalIncome - totalExpenses;

        const expenses = transactions.filter((transaction) => transaction.type === 'expense');
        const goalTotals = this.goalsService.getGoalContributionTotals(transactions);
        const topGoalEntry = Object.entries(goalTotals).sort((a, b) => b[1] - a[1])[0];

        const categoryTotals = new Map<string, number>();
        expenses.forEach((transaction) => {
          const current = categoryTotals.get(transaction.category) || 0;
          categoryTotals.set(transaction.category, current + transaction.amount);
        });

        const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0];
        const insights: InsightItem[] = [];

        if (topCategory) {
          const [categoryName, categoryAmount] = topCategory;
          const percentage =
            totalExpenses > 0 ? Math.round((categoryAmount / totalExpenses) * 100) : 0;

          insights.push({
            title: `${categoryName} is your biggest expense area`,
            text: `${percentage}% of your recorded expenses currently go to ${categoryName.toLowerCase()}.`,
            tag: 'Trend',
          });
        }

        insights.push({
          title: balance >= 0 ? 'Your balance is positive' : 'Your spending is above your income',
          text:
            balance >= 0
              ? `You currently have ${this.formatCurrency(balance)} left after expenses.`
              : `You are overspending by ${this.formatCurrency(Math.abs(balance))}.`,
          tag: balance >= 0 ? 'Positive' : 'Alert',
        });

        if (topGoalEntry) {
          const goalId = Number(topGoalEntry[0]);
          const goal = this.goalsService.getGoalsSnapshot().find((item) => item.id === goalId);

          if (goal) {
            insights.push({
              title: `${goal.name} is your most funded goal`,
              text: `${this.formatCurrency(topGoalEntry[1])} has been contributed to this goal so far.`,
              tag: 'Goals',
            });
          }
        } else {
          insights.push({
            title: 'No goal contributions recorded yet',
            text: 'Link a transaction to a goal to track real saving progress.',
            tag: 'Goals',
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

        if (transactions.length >= 5) {
          score += 5;
        }

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

  getFeaturedGoal(): Observable<{
    goal: Goal | null;
    contributedAmount: number;
    remainingAmount: number;
    progressPercentage: number;
    suggestedMonthlyContribution: number;
  }> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const goals = this.goalsService.getGoalsSnapshot();
        const featuredGoal = this.goalsService.getFeaturedGoal(goals, transactions);

        if (!featuredGoal) {
          return {
            goal: null,
            contributedAmount: 0,
            remainingAmount: 0,
            progressPercentage: 0,
            suggestedMonthlyContribution: 0,
          };
        }

        const contributedAmount = this.goalsService.getGoalSavedAmount(
          featuredGoal.id,
          transactions,
        );

        const remainingAmount = this.goalsService.getGoalRemainingAmount(
          featuredGoal,
          transactions,
        );

        const progressPercentage = this.goalsService.getGoalProgressPercentage(
          featuredGoal,
          transactions,
        );

        const suggestedMonthlyContribution = this.getSuggestedContribution(
          featuredGoal,
          remainingAmount,
        );

        return {
          goal: featuredGoal,
          contributedAmount,
          remainingAmount,
          progressPercentage,
          suggestedMonthlyContribution,
        };
      }),
    );
  }

  private getSuggestedContribution(goal: Goal, remainingAmount: number): number {
    const deadline = new Date(goal.deadline);

    if (remainingAmount <= 0 || Number.isNaN(deadline.getTime())) {
      return 0;
    }

    const today = new Date();
    const monthsLeft =
      (deadline.getFullYear() - today.getFullYear()) * 12 +
      (deadline.getMonth() - today.getMonth());

    if (monthsLeft <= 0) {
      return remainingAmount;
    }

    return Math.ceil(remainingAmount / monthsLeft);
  }

  private getTotalIncome(transactions: FinanceTransaction[]): number {
    return transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  private getTotalExpenses(transactions: FinanceTransaction[]): number {
    return transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  private getGoalContributionTotal(transactions: FinanceTransaction[]): number {
    return transactions
      .filter((transaction) => transaction.isGoalContribution === true)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  private getCurrentMonthTransactions(transactions: FinanceTransaction[]): FinanceTransaction[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    });
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
      const label = date.toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      });

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
}
