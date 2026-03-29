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

@Injectable({
  providedIn: 'root',
})
export class InsightsService {
  constructor(private readonly transactionService: TransactionService) {}

  getTrendMetrics(): Observable<TrendMetric[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const currentMonth = this.filterCurrentMonth(transactions);
        const previousMonth = this.filterPreviousMonth(transactions);

        const currentSpent = this.getTotalExpenses(currentMonth);
        const previousSpent = this.getTotalExpenses(previousMonth);

        const currentIncome = this.getTotalIncome(currentMonth);
        const previousIncome = this.getTotalIncome(previousMonth);

        const currentSavings = Math.max(currentIncome - currentSpent, 0);
        const previousSavings = Math.max(previousIncome - previousSpent, 0);

        const currentSavingsRate =
          currentIncome > 0 ? Math.round((currentSavings / currentIncome) * 100) : 0;
        const previousSavingsRate =
          previousIncome > 0 ? Math.round((previousSavings / previousIncome) * 100) : 0;

        const currentImpulse = this.countImpulseLikeTransactions(currentMonth);
        const previousImpulse = this.countImpulseLikeTransactions(previousMonth);

        const currentBillsHealth = this.getBillsHealth(currentMonth);
        const previousBillsHealth = this.getBillsHealth(previousMonth);

        return [
          {
            label: 'Spent this month',
            value: this.formatCurrency(currentSpent),
            change: this.getCurrencyChangeLabel(currentSpent, previousSpent),
            positive: currentSpent <= previousSpent,
          },
          {
            label: 'Savings rate',
            value: `${currentSavingsRate}%`,
            change: this.getSavingsRateLabel(currentSavingsRate, previousSavingsRate),
            positive: currentSavingsRate >= previousSavingsRate,
          },
          {
            label: 'Impulse buys',
            value: `${currentImpulse}`,
            change: this.getCountChangeLabel(currentImpulse, previousImpulse, 'buy'),
            positive: currentImpulse <= previousImpulse,
          },
          {
            label: 'Bills under control',
            value: `${currentBillsHealth}%`,
            change: this.getControlLabel(currentBillsHealth, previousBillsHealth),
            positive: currentBillsHealth >= previousBillsHealth,
          },
        ];
      }),
    );
  }

  getDetectedHabits(): Observable<HabitInsight[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
        const expenseTransactions = this.getExpenseTransactions(transactions);
        const weekdayExpenses = expenseTransactions.filter((item) => !this.isWeekend(item.date));
        const weekendExpenses = expenseTransactions.filter((item) => this.isWeekend(item.date));

        const weekdayAverage = this.getAverageAmount(weekdayExpenses);
        const weekendAverage = this.getAverageAmount(weekendExpenses);

        const recurringCategories = this.getRecurringCategories(expenseTransactions);
        const largestCategory = this.getTopExpenseCategory(expenseTransactions);

        const habits: HabitInsight[] = [];

        if (weekendAverage > weekdayAverage * 1.2) {
          habits.push({
            tag: 'Good sign',
            title: 'You spend less on weekdays',
            text: 'Most extra spending happens on weekends, which helps keep weekday spending lower.',
            tone: 'good',
          });
        } else if (weekdayAverage > weekendAverage * 1.1) {
          habits.push({
            tag: 'Watch this',
            title: 'Weekday spending is rising',
            text: 'You are spending more during the week than before, so it may help to review small daily costs.',
            tone: 'watch',
          });
        }

        if (recurringCategories.length > 0) {
          habits.push({
            tag: 'Regular pattern',
            title: 'Your bills look predictable',
            text: `You often spend in ${recurringCategories.slice(0, 2).join(' and ')}, so these costs are becoming easier to plan for.`,
            tone: 'neutral',
          });
        }

        if (largestCategory) {
          habits.push({
            tag: 'Main category',
            title: `${largestCategory} takes most of your budget`,
            text: `This category had the biggest share of your recent spending, so even a small cut here could help a lot.`,
            tone: 'watch',
          });
        }

        if (!habits.length) {
          habits.push({
            tag: 'Balanced',
            title: 'Your spending looks steady',
            text: 'No strong habit stands out right now. Your recent spending seems fairly balanced.',
            tone: 'neutral',
          });
        }

        return habits.slice(0, 4);
      }),
    );
  }

  getAlerts(): Observable<AlertItem[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
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

          if (current === 0 && previous === 0) continue;

          const difference = current - previous;
          const changePercent = this.getPercentChange(current, previous);

          if (previous === 0 && current > 0) {
            alerts.push({
              title: `${category} spending started this month`,
              text: 'This category did not appear last month, but you spent money on it this month.',
              severity: 'low',
              amount: this.formatCurrency(current),
            });
            continue;
          }

          if (difference > 0 && Math.abs(changePercent) >= 25) {
            alerts.push({
              title: `${category} spending went up`,
              text: `${this.formatCurrency(Math.abs(difference))} more than last month.`,
              severity: Math.abs(changePercent) >= 50 ? 'high' : 'medium',
              amount: this.formatCurrency(current),
            });
          } else if (difference < 0 && Math.abs(changePercent) >= 20) {
            alerts.push({
              title: `${category} spending went down`,
              text: `${this.formatCurrency(Math.abs(difference))} less than last month.`,
              severity: 'low',
              amount: this.formatCurrency(current),
            });
          }
        }

        if (!alerts.length) {
          alerts.push({
            title: 'No big changes found',
            text: 'Your spending looks fairly steady this month.',
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
            note: 'Average for weekdays',
          },
          {
            label: 'Weekend average',
            value: this.formatCurrency(Math.round(weekendAverage)),
            note: 'Average for weekends',
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
            note: 'Day with the lowest spending',
          },
        ];
      }),
    );
  }

  getCategoryGrowth(): Observable<CategoryGrowth[]> {
    return this.transactionService.transactions$.pipe(
      map((transactions) => {
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
            let label = 'No big change';

            if (previous === 0 && current > 0) {
              direction = 'up';
              label = 'New this month';
            } else if (current === 0 && previous > 0) {
              direction = 'down';
              label = 'No spending now';
            } else if (roundedChange === 0) {
              label = 'No big change';
            } else if (roundedChange >= 100) {
              label = direction === 'up' ? 'Up a lot' : 'Down a lot';
            } else {
              label = `${direction === 'up' ? '+' : '-'}${roundedChange}%`;
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

  private filterCurrentMonth(transactions: FinanceTransaction[]): FinanceTransaction[] {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }

  private filterPreviousMonth(transactions: FinanceTransaction[]): FinanceTransaction[] {
    const now = new Date();
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    return transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() === previousMonth && date.getFullYear() === previousYear;
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
    if (!transactions.length) return 0;
    const total = transactions.reduce((sum, item) => sum + item.amount, 0);
    return total / transactions.length;
  }

  private countImpulseLikeTransactions(transactions: FinanceTransaction[]): number {
    const impulseCategories = ['Food', 'Shopping', 'Entertainment', 'Lifestyle', 'Dining'];
    return this.getExpenseTransactions(transactions).filter((transaction) =>
      impulseCategories.includes(transaction.category),
    ).length;
  }

  private getBillsHealth(transactions: FinanceTransaction[]): number {
    const billCategories = ['Rent', 'Utilities', 'Bills', 'Internet', 'Insurance', 'Loan'];

    const billTransactions = this.getExpenseTransactions(transactions).filter((transaction) =>
      billCategories.includes(transaction.category),
    );

    if (!billTransactions.length) return 100;

    const positiveCount = billTransactions.filter((item) => item.amount > 0).length;
    return Math.max(Math.min(Math.round((positiveCount / billTransactions.length) * 100), 100), 0);
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

  private getCurrencyChangeLabel(current: number, previous: number): string {
    if (previous === 0 && current === 0) return 'No change';
    if (previous === 0) return 'New this month';

    const diff = current - previous;
    const absDiff = Math.abs(diff);

    if (diff === 0) return 'No change';

    return diff > 0
      ? `${this.formatCurrency(absDiff)} more than last month`
      : `${this.formatCurrency(absDiff)} less than last month`;
  }

  private getSavingsRateLabel(current: number, previous: number): string {
    const diff = current - previous;

    if (diff === 0) return 'Same as last month';

    return diff > 0 ? `Up ${diff}% from last month` : `Down ${Math.abs(diff)}% from last month`;
  }

  private getCountChangeLabel(current: number, previous: number, noun: string): string {
    const diff = current - previous;

    if (diff === 0) return 'Same as last month';

    if (diff > 0) {
      return `${diff} more ${noun}${diff > 1 ? 's' : ''}`;
    }

    return `${Math.abs(diff)} fewer ${noun}${Math.abs(diff) > 1 ? 's' : ''}`;
  }

  private getControlLabel(current: number, previous: number): string {
    const diff = current - previous;

    if (diff === 0) return 'Same as last month';

    return diff > 0 ? `Better by ${diff}%` : `Lower by ${Math.abs(diff)}%`;
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
