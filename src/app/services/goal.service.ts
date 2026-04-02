import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Goal, GoalRecommendation } from '../model/goals.model';
import { FinanceTransaction } from '../model/transactions.model';

type GoalInput = Omit<Goal, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class GoalsService {
  private readonly storageKey = 'moneymind_goals';

  private goalsSubject = new BehaviorSubject<Goal[]>(this.loadGoals());
  private recommendationsSubject = new BehaviorSubject<GoalRecommendation[]>([]);

  getGoals(): Observable<Goal[]> {
    return this.goalsSubject.asObservable();
  }

  getGoalsSnapshot(): Goal[] {
    return this.goalsSubject.value;
  }

  getRecommendations(): Observable<GoalRecommendation[]> {
    return this.recommendationsSubject.asObservable();
  }

  setRecommendations(recommendations: GoalRecommendation[]): void {
    this.recommendationsSubject.next(recommendations);
  }

  addGoal(goal: GoalInput): void {
    const newGoal: Goal = {
      id: Date.now(),
      ...goal,
    };

    const updatedGoals = [...this.goalsSubject.value, newGoal];
    this.saveGoals(updatedGoals);
  }

  updateGoal(id: number, updatedGoal: GoalInput): void {
    const updatedGoals = this.goalsSubject.value.map((goal) =>
      goal.id === id ? { ...goal, ...updatedGoal, id } : goal,
    );

    this.saveGoals(updatedGoals);
  }

  deleteGoal(id: number): void {
    const updatedGoals = this.goalsSubject.value.filter((goal) => goal.id !== id);
    this.saveGoals(updatedGoals);
  }

  clearGoals(): void {
    localStorage.removeItem(this.storageKey);
    this.goalsSubject.next([]);
    this.recommendationsSubject.next([]);
  }

  getGoalSavedAmount(goalId: number, transactions: FinanceTransaction[]): number {
    return transactions
      .filter(
        (transaction) =>
          transaction.isGoalContribution === true &&
          transaction.goalId === goalId &&
          transaction.amount > 0,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  getGoalContributionTotals(transactions: FinanceTransaction[]): Record<number, number> {
    return transactions.reduce<Record<number, number>>((acc, transaction) => {
      if (
        transaction.isGoalContribution === true &&
        transaction.goalId != null &&
        transaction.amount > 0
      ) {
        acc[transaction.goalId] = (acc[transaction.goalId] ?? 0) + transaction.amount;
      }

      return acc;
    }, {});
  }

  getGoalProgressPercentage(goal: Goal, transactions: FinanceTransaction[]): number {
    if (goal.targetAmount <= 0) {
      return 0;
    }

    const savedAmount = this.getGoalSavedAmount(goal.id, transactions);
    return Math.min(Math.round((savedAmount / goal.targetAmount) * 100), 100);
  }

  getGoalRemainingAmount(goal: Goal, transactions: FinanceTransaction[]): number {
    const savedAmount = this.getGoalSavedAmount(goal.id, transactions);
    return Math.max(goal.targetAmount - savedAmount, 0);
  }

  getFeaturedGoal(goals: Goal[], transactions: FinanceTransaction[]): Goal | null {
    if (!goals.length) {
      return null;
    }

    const activeGoals = goals.filter((goal) => {
      const savedAmount = this.getGoalSavedAmount(goal.id, transactions);
      return savedAmount < goal.targetAmount;
    });

    const source = activeGoals.length ? activeGoals : goals;

    return [...source].sort((a, b) => {
      const aDeadline = new Date(a.deadline).getTime();
      const bDeadline = new Date(b.deadline).getTime();

      const aHasValidDeadline = !Number.isNaN(aDeadline);
      const bHasValidDeadline = !Number.isNaN(bDeadline);

      if (aHasValidDeadline && bHasValidDeadline && aDeadline !== bDeadline) {
        return aDeadline - bDeadline;
      }

      if (aHasValidDeadline && !bHasValidDeadline) {
        return -1;
      }

      if (!aHasValidDeadline && bHasValidDeadline) {
        return 1;
      }

      const aProgress = this.getGoalProgressPercentage(a, transactions);
      const bProgress = this.getGoalProgressPercentage(b, transactions);

      return bProgress - aProgress;
    })[0];
  }

  private loadGoals(): Goal[] {
    const stored = localStorage.getItem(this.storageKey);

    if (!stored) {
      return [];
    }

    try {
      return JSON.parse(stored) as Goal[];
    } catch (error) {
      console.error('Error parsing goals from localStorage:', error);
      return [];
    }
  }

  private saveGoals(goals: Goal[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(goals));
    this.goalsSubject.next(goals);
  }
}
