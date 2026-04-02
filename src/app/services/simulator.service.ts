import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { combineLatest, map, Observable } from 'rxjs';

import { Goal } from '../model/goals.model';
import { ScenarioCategory, SimulatorBaseData } from '../model/simulator.model';
import { FinanceTransaction } from '../model/transactions.model';
import { GoalsService } from './goal.service';
import { TransactionService } from './transaction.service';

@Injectable({
  providedIn: 'root',
})
export class SimulatorService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly goalService: GoalsService,
  ) {}

  getBaseData(): Observable<SimulatorBaseData> {
    return combineLatest([this.transactionService.transactions$, this.goalService.getGoals()]).pipe(
      map(([transactions, goals]) => {
        const currentMonthTransactions = this.getCurrentMonthTransactions(transactions);
        const hasTransactionsThisMonth = currentMonthTransactions.length > 0;

        const monthlyIncome = currentMonthTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.amount, 0);

        const expenseTotals = this.groupExpenseCategories(currentMonthTransactions);

        const categoryConfig: Array<{
          key: string;
          name: string;
          colorClass: string;
          fallback: number;
          max: number;
        }> = [
          {
            key: 'food',
            name: 'Food',
            colorClass: 'slider-food',
            fallback: 3000,
            max: 12000,
          },
          {
            key: 'transport',
            name: 'Transport',
            colorClass: 'slider-transport',
            fallback: 2000,
            max: 6000,
          },
          {
            key: 'entertainment',
            name: 'Entertainment',
            colorClass: 'slider-entertainment',
            fallback: 1500,
            max: 8000,
          },
          {
            key: 'shopping',
            name: 'Shopping',
            colorClass: 'slider-shopping',
            fallback: 1800,
            max: 7000,
          },
        ];

        const categories: ScenarioCategory[] = categoryConfig.map((item) => {
          const amount = hasTransactionsThisMonth
            ? expenseTotals[item.name] ?? 0
            : item.fallback;

          return {
            key: item.key,
            name: item.name,
            amount,
            colorClass: item.colorClass,
            min: 0,
            max: item.max,
            step: 100,
          };
        });

        const baselineValues = categories.reduce<Record<string, number>>((acc, category) => {
          acc[category.key] = category.amount;
          return acc;
        }, {});

        const selectedGoal = this.goalService.getFeaturedGoal(goals, transactions);
        const currentGoalSaved = selectedGoal
          ? this.goalService.getGoalSavedAmount(selectedGoal.id, transactions)
          : 0;

        return {
          monthlyIncome,
          currentGoalSaved,
          targetGoal: selectedGoal?.targetAmount ?? 0,
          currentMonthlyGoalContribution: selectedGoal?.monthlyContribution ?? 0,
          categories,
          baselineValues,
          selectedGoal,
          hasTransactionsThisMonth,
        };
      }),
    );
  }

  getComparisonChartData(
    currentSpending: number,
    plannedSpending: number,
    currentFreeMoney: number,
    newFreeMoney: number,
    currentMonthlyGoalContribution: number,
    newGoalContribution: number,
  ): ChartData<'bar'> {
    return {
      labels: ['Expenses', 'Left to Save', 'Goal Contribution'],
      datasets: [
        {
          label: 'Before',
          data: [currentSpending, currentFreeMoney, currentMonthlyGoalContribution],
          borderRadius: 10,
          maxBarThickness: 34,
          backgroundColor: 'rgba(125, 211, 252, 0.7)',
        },
        {
          label: 'After',
          data: [plannedSpending, newFreeMoney, newGoalContribution],
          borderRadius: 10,
          maxBarThickness: 34,
          backgroundColor: 'rgba(167, 243, 208, 0.75)',
        },
      ],
    };
  }

  getComparisonChartOptions(): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#e6edf6',
            boxWidth: 12,
            boxHeight: 12,
            useBorderRadius: true,
            borderRadius: 4,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#e6edf6',
          bodyColor: '#9aa6b2',
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y ?? 0;
              return `${context.dataset.label}: Rs ${value.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#9aa6b2',
          },
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#9aa6b2',
            callback: (value) => `Rs ${Number(value).toLocaleString()}`,
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
          },
          border: {
            display: false,
          },
        },
      },
    };
  }

  private getCurrentMonthTransactions(transactions: FinanceTransaction[]): FinanceTransaction[] {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return (
        !Number.isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year
      );
    });
  }

  private groupExpenseCategories(transactions: FinanceTransaction[]): Record<string, number> {
    const totals: Record<string, number> = {
      Food: 0,
      Transport: 0,
      Entertainment: 0,
      Shopping: 0,
    };

    transactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        const normalizedCategory = this.normalizeCategoryName(transaction.category);

        if (normalizedCategory && totals[normalizedCategory] !== undefined) {
          totals[normalizedCategory] += transaction.amount;
        }
      });

    return totals;
  }

  private normalizeCategoryName(category: string | undefined | null): string {
    if (!category) {
      return '';
    }

    const value = category.trim().toLowerCase();

    switch (value) {
      case 'food':
      case 'groceries':
      case 'restaurant':
      case 'dining':
        return 'Food';

      case 'transport':
      case 'travel':
      case 'fuel':
      case 'taxi':
        return 'Transport';

      case 'entertainment':
      case 'fun':
      case 'movies':
      case 'subscriptions':
        return 'Entertainment';

      case 'shopping':
      case 'shop':
      case 'clothes':
      case 'fashion':
        return 'Shopping';

      default:
        return '';
    }
  }
}