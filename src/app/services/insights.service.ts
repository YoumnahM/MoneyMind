import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ChartConfiguration, ChartData } from 'chart.js';

import {
  AlertItem,
  CategoryGrowth,
  HabitInsight,
  TrendMetric,
  WeekPattern,
} from '../model/insights.model';
import { FinanceTransaction } from '../model/transactions.model';
import { TransactionService } from './transaction.service';
import { GoalsService } from './goal.service';

@Injectable({
  providedIn: 'root',
})
export class InsightsService {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly goalsService: GoalsService,
  ) {}

  hasTransactions(): Observable<boolean> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => transactions.length > 0),
    );
  }

  getTrendMetrics(): Observable<TrendMetric[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        if (!transactions.length) {
          return [];
        }

        const currentMonth = this.filterCurrentMonth(transactions);
        const previousMonth = this.filterPreviousMonth(transactions);

        const currentSpent = this.getTotalExpenses(currentMonth);
        const previousSpent = this.getTotalExpenses(previousMonth);

        const currentIncome = this.getTotalIncome(currentMonth);
        const previousIncome = this.getTotalIncome(previousMonth);

        const currentNet = currentIncome - currentSpent;
        const previousNet = previousIncome - previousSpent;

        const currentSmallBuys = this.getSmallBuysCount(
          this.getExpenseTransactions(currentMonth),
          300,
        );
        const previousSmallBuys = this.getSmallBuysCount(
          this.getExpenseTransactions(previousMonth),
          300,
        );

        return [
          {
            label: 'Spent this month',
            value: this.formatCurrency(currentSpent),
            change: this.getSpendChangeLabel(currentSpent, previousSpent),
            positive: currentSpent <= previousSpent,
          },
          {
            label: 'Income this month',
            value: this.formatCurrency(currentIncome),
            change: this.getIncomeChangeLabel(currentIncome, previousIncome),
            positive: currentIncome >= previousIncome,
          },
          {
            label: 'Small purchases',
            value: `${currentSmallBuys}`,
            change: this.getCountChangeLabel(currentSmallBuys, previousSmallBuys, 'purchase'),
            positive: currentSmallBuys <= previousSmallBuys,
          },
          {
            label: 'Left after spending',
            value: this.formatCurrency(currentNet),
            change: this.getLeftAfterSpendingLabel(currentNet, previousNet),
            positive: currentNet >= previousNet,
          },
        ];
      }),
    );
  }

  getDetectedHabits(): Observable<HabitInsight[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const allExpenses = this.getExpenseTransactions(transactions);

        if (!allExpenses.length) {
          return [
            {
              tag: 'Getting started',
              title: 'Add more transactions to unlock insights',
              text: 'Once you add income and expenses, this section will explain your spending habits in simple terms.',
              tone: 'neutral',
            },
          ];
        }

        const currentMonthTransactions = this.filterCurrentMonth(transactions);
        const currentMonthExpenses = this.getExpenseTransactions(currentMonthTransactions);

        const weekdayExpenses = currentMonthExpenses.filter((item) => !this.isWeekend(item.date));
        const weekendExpenses = currentMonthExpenses.filter((item) => this.isWeekend(item.date));

        const weekdayAverage = this.getAverageAmount(weekdayExpenses);
        const weekendAverage = this.getAverageAmount(weekendExpenses);

        const recurringCategories = this.getRecurringCategories(allExpenses);
        const topCategory = this.getTopExpenseCategory(allExpenses);
        const smallBuysCount = this.getSmallBuysCount(currentMonthExpenses, 300);
        const goalContributionTotal = this.getGoalContributionTotal(currentMonthTransactions);

        const habits: HabitInsight[] = [];

        if (weekendAverage > 0 && weekendAverage > weekdayAverage * 1.2) {
          habits.push({
            tag: 'Weekend pattern',
            title: 'You tend to spend more on weekends',
            text: 'Your average weekend spending is noticeably higher than your weekday spending this month.',
            tone: 'watch',
          });
        } else if (weekdayAverage > 0 && weekdayAverage > weekendAverage * 1.15) {
          habits.push({
            tag: 'Weekday pattern',
            title: 'Your weekday costs are a little higher',
            text: 'Everyday expenses during the week may be adding up more than weekend spending.',
            tone: 'watch',
          });
        } else {
          habits.push({
            tag: 'Balanced',
            title: 'Your spending looks fairly balanced',
            text: 'There is no major gap between weekday and weekend spending right now.',
            tone: 'good',
          });
        }

        if (recurringCategories.length > 0) {
          habits.push({
            tag: 'Regular costs',
            title: 'Some categories show up often',
            text: `You spend regularly on ${recurringCategories.slice(0, 2).join(' and ')}, which makes these easier to plan for.`,
            tone: 'neutral',
          });
        }

        if (topCategory) {
          habits.push({
            tag: 'Top category',
            title: `${topCategory} is taking the biggest share`,
            text: 'This category currently uses the largest portion of your expense budget.',
            tone: 'watch',
          });
        }

        if (smallBuysCount >= 4) {
          habits.push({
            tag: 'Small costs',
            title: 'Small purchases may be building up',
            text: `You made ${smallBuysCount} small purchases this month. Small amounts can still have a real impact over time.`,
            tone: 'watch',
          });
        }

        if (goalContributionTotal > 0) {
          habits.push({
            tag: 'Goal progress',
            title: 'You are putting money toward goals',
            text: `${this.formatCurrency(goalContributionTotal)} was linked to goal contributions this month.`,
            tone: 'good',
          });
        }

        return habits.slice(0, 4);
      }),
    );
  }

  getAlerts(): Observable<AlertItem[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        if (!transactions.length) {
          return [
            {
              title: 'No alerts yet',
              text: 'Once you have more spending history, this section will highlight unusual changes and categories to watch.',
              severity: 'low',
            },
          ];
        }

        const currentMonth = this.filterCurrentMonth(transactions);
        const previousMonth = this.filterPreviousMonth(transactions);

        const currentByCategory = this.groupExpensesByCategory(currentMonth);
        const previousByCategory = this.groupExpensesByCategory(previousMonth);

        const categoryNames = Array.from(
          new Set([...Object.keys(currentByCategory), ...Object.keys(previousByCategory)]),
        );

        const alerts: AlertItem[] = [];

        for (const category of categoryNames) {
          const current = currentByCategory[category] ?? 0;
          const previous = previousByCategory[category] ?? 0;

          if (current === 0 && previous === 0) {
            continue;
          }

          const difference = current - previous;
          const changePercent = this.getPercentChange(current, previous);

          if (previous === 0 && current > 0) {
            alerts.push({
              title: `${category} spending appeared this month`,
              text: 'This category was not active last month, but it shows spending this month.',
              severity: 'low',
              amount: this.formatCurrency(current),
            });
            continue;
          }

          if (difference > 0 && Math.abs(changePercent) >= 25) {
            alerts.push({
              title: `${category} spending is higher`,
              text: `${this.formatCurrency(Math.abs(difference))} more than last month.`,
              severity: Math.abs(changePercent) >= 50 ? 'high' : 'medium',
              amount: this.formatCurrency(current),
            });
          } else if (difference < 0 && Math.abs(changePercent) >= 20) {
            alerts.push({
              title: `${category} spending is lower`,
              text: `${this.formatCurrency(Math.abs(difference))} less than last month.`,
              severity: 'low',
              amount: this.formatCurrency(current),
            });
          }
        }

        const currentGoalMoney = this.getGoalContributionTotal(currentMonth);

        if (currentGoalMoney > 0) {
          alerts.unshift({
            title: 'You contributed to your goals',
            text: 'This month includes real goal-linked contributions from your transactions.',
            severity: 'low',
            amount: this.formatCurrency(currentGoalMoney),
          });
        }

        if (!alerts.length) {
          alerts.push({
            title: 'No major changes found',
            text: 'Your spending looks fairly steady compared with last month.',
            severity: 'low',
          });
        }

        return alerts.slice(0, 5);
      }),
    );
  }

  getWeekPatterns(): Observable<WeekPattern[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const expenses = this.getExpenseTransactions(this.filterCurrentMonth(transactions));

        if (!expenses.length) {
          return [
            {
              label: 'Weekday average',
              value: 'Rs 0',
              note: 'No weekday spending recorded yet',
            },
            {
              label: 'Weekend average',
              value: 'Rs 0',
              note: 'No weekend spending recorded yet',
            },
            {
              label: 'Difference',
              value: 'No data',
              note: 'Add more transactions to compare your pattern',
            },
            {
              label: 'Lowest spend day',
              value: 'No data',
              note: 'Not enough data yet',
            },
          ];
        }

        const weekdayExpenses = expenses.filter((item) => !this.isWeekend(item.date));
        const weekendExpenses = expenses.filter((item) => this.isWeekend(item.date));

        const weekdayAverage = this.getAverageAmount(weekdayExpenses);
        const weekendAverage = this.getAverageAmount(weekendExpenses);

        const difference = weekendAverage - weekdayAverage;
        const quietestDay = this.getQuietestDay(expenses);

        return [
          {
            label: 'Weekday average',
            value: this.formatCurrency(Math.round(weekdayAverage)),
            note: 'Average spending from Monday to Friday',
          },
          {
            label: 'Weekend average',
            value: this.formatCurrency(Math.round(weekendAverage)),
            note: 'Average spending on Saturday and Sunday',
          },
          {
            label: 'Difference',
            value:
              difference === 0
                ? 'No change'
                : `${difference > 0 ? '+' : '-'}${this.formatCurrency(Math.abs(Math.round(difference)))}`,
            note: 'Weekend compared with weekdays',
          },
          {
            label: 'Lowest spend day',
            value: quietestDay,
            note: 'Your quietest day for spending this month',
          },
        ];
      }),
    );
  }

  getCategoryGrowth(): Observable<CategoryGrowth[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        if (!transactions.length) {
          return [];
        }

        const currentMonth = this.filterCurrentMonth(transactions);
        const previousMonth = this.filterPreviousMonth(transactions);

        const currentByCategory = this.groupExpensesByCategory(currentMonth);
        const previousByCategory = this.groupExpensesByCategory(previousMonth);

        const categoryNames = Array.from(
          new Set([...Object.keys(currentByCategory), ...Object.keys(previousByCategory)]),
        );

        return categoryNames
          .map((name) => {
            const current = currentByCategory[name] ?? 0;
            const previous = previousByCategory[name] ?? 0;
            const rawChange = this.getPercentChange(current, previous);

            const roundedChange = Math.abs(Math.round(rawChange));
            const safeChange = Math.min(roundedChange, 100);

            let direction: 'up' | 'down' = current >= previous ? 'up' : 'down';
            let label = 'About the same';

            if (previous === 0 && current > 0) {
              direction = 'up';
              label = 'Started this month';
            } else if (current === 0 && previous > 0) {
              direction = 'down';
              label = 'No spending now';
            } else if (roundedChange === 0) {
              label = 'About the same';
            } else if (roundedChange >= 100) {
              label = direction === 'up' ? 'Much higher' : 'Much lower';
            } else {
              label = direction === 'up' ? `${roundedChange}% higher` : `${roundedChange}% lower`;
            }

            return {
              name,
              change: safeChange,
              amount: this.formatCurrency(current),
              direction,
              label,
            } as CategoryGrowth;
          })
          .sort((a, b) => b.change - a.change)
          .slice(0, 6);
      }),
    );
  }

  getTrendChartData(): Observable<ChartData<'line'>> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const weeklyData = this.getLastSixWeeksExpenseTotals(transactions);

        return {
          labels: weeklyData.map((item) => item.label),
          datasets: [
            {
              data: weeklyData.map((item) => item.total),
              label: 'Spending',
              fill: true,
              tension: 0.35,
              borderColor: 'rgba(125, 211, 252, 1)',
              backgroundColor: 'rgba(125, 211, 252, 0.12)',
              pointBackgroundColor: 'rgba(125, 211, 252, 1)',
              pointBorderColor: 'rgba(125, 211, 252, 1)',
              pointHoverBackgroundColor: 'rgba(125, 211, 252, 1)',
              pointHoverBorderColor: '#ffffff',
            },
          ],
        };
      }),
    );
  }

  getWeekdayChartData(): Observable<ChartData<'bar'>> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const currentMonthExpenses = this.getExpenseTransactions(
          this.filterCurrentMonth(transactions),
        );
        const weekdayTotals = this.getWeekdayTotals(currentMonthExpenses);

        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              data: [
                weekdayTotals.Monday,
                weekdayTotals.Tuesday,
                weekdayTotals.Wednesday,
                weekdayTotals.Thursday,
                weekdayTotals.Friday,
                weekdayTotals.Saturday,
                weekdayTotals.Sunday,
              ],
              label: 'Average spend',
              backgroundColor: [
                'rgba(125, 211, 252, 0.65)',
                'rgba(125, 211, 252, 0.65)',
                'rgba(125, 211, 252, 0.65)',
                'rgba(125, 211, 252, 0.65)',
                'rgba(125, 211, 252, 0.65)',
                'rgba(167, 243, 208, 0.75)',
                'rgba(167, 243, 208, 0.75)',
              ],
              borderRadius: 10,
              borderSkipped: false,
            },
          ],
        };
      }),
    );
  }

  getTrendChartOptions(): ChartConfiguration<'line'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
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
        },
        y: {
          ticks: {
            color: '#9aa6b2',
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
          },
        },
      },
    };
  }

  getWeekdayChartOptions(): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
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
        },
        y: {
          ticks: {
            color: '#9aa6b2',
          },
          grid: {
            color: 'rgba(255,255,255,0.06)',
          },
        },
      },
    };
  }

  private getIncomeChangeLabel(current: number, previous: number): string {
    if (previous === 0 && current === 0) return 'No income in either month';
    if (previous === 0) return 'Income started this month';

    const diff = current - previous;
    const absDiff = Math.abs(diff);

    if (diff === 0) return 'Same as last month';

    return diff > 0
      ? `${this.formatCurrency(absDiff)} more than last month`
      : `${this.formatCurrency(absDiff)} less than last month`;
  }

  private filterCurrentMonth(transactions: FinanceTransaction[]): FinanceTransaction[] {
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

  private filterPreviousMonth(transactions: FinanceTransaction[]): FinanceTransaction[] {
    const now = new Date();
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return (
        !Number.isNaN(date.getTime()) &&
        date.getMonth() === previousMonth &&
        date.getFullYear() === previousYear
      );
    });
  }

  private getExpenseTransactions(transactions: FinanceTransaction[]): FinanceTransaction[] {
    return transactions.filter((transaction) => transaction.type === 'expense');
  }

  private getIncomeTransactions(transactions: FinanceTransaction[]): FinanceTransaction[] {
    return transactions.filter((transaction) => transaction.type === 'income');
  }

  private getTotalExpenses(transactions: FinanceTransaction[]): number {
    return this.getExpenseTransactions(transactions).reduce((sum, item) => sum + item.amount, 0);
  }

  private getTotalIncome(transactions: FinanceTransaction[]): number {
    return this.getIncomeTransactions(transactions).reduce((sum, item) => sum + item.amount, 0);
  }

  private getAverageAmount(transactions: FinanceTransaction[]): number {
    if (!transactions.length) {
      return 0;
    }

    const total = transactions.reduce((sum, item) => sum + item.amount, 0);
    return total / transactions.length;
  }

  private getGoalContributionTotal(transactions: FinanceTransaction[]): number {
    return transactions
      .filter((transaction) => transaction.isGoalContribution === true)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  private getSmallBuysCount(transactions: FinanceTransaction[], maxAmount: number): number {
    return transactions.filter((transaction) => transaction.amount <= maxAmount).length;
  }

  private getRecurringCategories(transactions: FinanceTransaction[]): string[] {
    const countByCategory = transactions.reduce<Record<string, number>>((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(countByCategory)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category);
  }

  private getTopExpenseCategory(transactions: FinanceTransaction[]): string | null {
    const totals = this.groupExpensesByCategory(transactions);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries[0][0] : null;
  }

  private groupExpensesByCategory(transactions: FinanceTransaction[]): Record<string, number> {
    return this.getExpenseTransactions(transactions).reduce<Record<string, number>>(
      (acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] ?? 0) + transaction.amount;
        return acc;
      },
      {},
    );
  }

  private getPercentChange(current: number, previous: number): number {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }

  private getSpendChangeLabel(current: number, previous: number): string {
    if (previous === 0 && current === 0) return 'No spending in either month';
    if (previous === 0) return 'Spending started this month';

    const diff = current - previous;
    const absDiff = Math.abs(diff);

    if (diff === 0) return 'Same as last month';

    return diff > 0
      ? `${this.formatCurrency(absDiff)} more than last month`
      : `${this.formatCurrency(absDiff)} less than last month`;
  }

  private getLeftAfterSpendingLabel(current: number, previous: number): string {
    if (previous === 0 && current === 0) return 'No money left in either month';
    if (previous === 0) return 'Started this month';

    const diff = current - previous;
    const absDiff = Math.abs(diff);

    if (diff === 0) return 'Same as last month';

    return diff > 0
      ? `${this.formatCurrency(absDiff)} more left than last month`
      : `${this.formatCurrency(absDiff)} less left than last month`;
  }

  private getCountChangeLabel(current: number, previous: number, noun: string): string {
    const diff = current - previous;

    if (diff === 0) return 'Same as last month';

    if (diff > 0) {
      return `${diff} more ${noun}${diff > 1 ? 's' : ''}`;
    }

    return `${Math.abs(diff)} fewer ${noun}${Math.abs(diff) > 1 ? 's' : ''}`;
  }

  private getLastSixWeeksExpenseTotals(
    transactions: FinanceTransaction[],
  ): Array<{ label: string; total: number }> {
    const now = new Date();
    const result: Array<{ label: string; total: number }> = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7 + 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const total = this.getExpenseTransactions(transactions)
        .filter((transaction) => {
          const date = new Date(transaction.date);
          return date >= start && date <= end;
        })
        .reduce((sum, item) => sum + item.amount, 0);

      result.push({
        label: this.formatShortDate(start),
        total: Math.round(total),
      });
    }

    return result;
  }

  private getWeekdayTotals(
    transactions: FinanceTransaction[],
  ): Record<
    'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday',
    number
  > {
    const totals = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    const counts = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const dayName = this.getDayName(date.getDay());

      totals[dayName] += transaction.amount;
      counts[dayName] += 1;
    });

    (Object.keys(totals) as Array<keyof typeof totals>).forEach((day) => {
      totals[day] = counts[day] > 0 ? Math.round(totals[day] / counts[day]) : 0;
    });

    return totals;
  }

  private getQuietestDay(transactions: FinanceTransaction[]): string {
    const totals = this.getWeekdayTotals(transactions);
    const sorted = Object.entries(totals).sort((a, b) => a[1] - b[1]);
    return sorted.length ? sorted[0][0] : 'No data';
  }

  private isWeekend(dateInput: string | Date): boolean {
    const date = new Date(dateInput);
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private getDayName(
    day: number,
  ): 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' {
    switch (day) {
      case 1:
        return 'Monday';
      case 2:
        return 'Tuesday';
      case 3:
        return 'Wednesday';
      case 4:
        return 'Thursday';
      case 5:
        return 'Friday';
      case 6:
        return 'Saturday';
      case 0:
      default:
        return 'Sunday';
    }
  }

  private formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString()}`;
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }
}