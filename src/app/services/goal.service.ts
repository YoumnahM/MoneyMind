import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Goal, GoalRecommendation } from '../model/goals.model';

type GoalInput = Omit<Goal, 'id'>;

@Injectable({
  providedIn: 'root',
})
export class GoalsService {
  private readonly storageKey = 'moneymind_goals';

  private goalsSubject = new BehaviorSubject<Goal[]>(this.loadGoals());
  private recommendationsSubject = new BehaviorSubject<GoalRecommendation[]>([]);

  constructor() {
    this.updateRecommendations(this.goalsSubject.value);
  }

  getGoals(): Observable<Goal[]> {
    return this.goalsSubject.asObservable();
  }

  getGoalsSnapshot(): Goal[] {
    return this.goalsSubject.value;
  }

  getRecommendations(): Observable<GoalRecommendation[]> {
    return this.recommendationsSubject.asObservable();
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

  contributeToGoal(goalId: number, amount: number): void {
    if (amount <= 0) return;

    const updatedGoals = this.goalsSubject.value.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            savedAmount: Math.min(goal.savedAmount + amount, goal.targetAmount),
          }
        : goal,
    );

    this.saveGoals(updatedGoals);
  }

  removeContributionFromGoal(goalId: number, amount: number): void {
    if (amount <= 0) return;

    const updatedGoals = this.goalsSubject.value.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            savedAmount: Math.max(goal.savedAmount - amount, 0),
          }
        : goal,
    );

    this.saveGoals(updatedGoals);
  }

  clearGoals(): void {
    localStorage.removeItem(this.storageKey);
    this.goalsSubject.next([]);
    this.recommendationsSubject.next([]);
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
    this.updateRecommendations(goals);
  }

  private updateRecommendations(goals: Goal[]): void {
    const recommendations: GoalRecommendation[] = [];

    if (!goals.length) {
      recommendations.push({
        title: 'Start your first savings goal',
        text: 'Create a goal to start tracking progress and building momentum.',
        tone: 'tip',
      });
    }

    goals.forEach((goal) => {
      const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;

      if (progress >= 100) {
        recommendations.push({
          title: `${goal.name} completed`,
          text: 'Great work. You reached this goal successfully.',
          tone: 'good',
        });
      } else if (progress < 35) {
        recommendations.push({
          title: `Boost ${goal.name}`,
          text: 'Consider increasing your monthly contribution to stay on track.',
          tone: 'watch',
        });
      } else {
        recommendations.push({
          title: `${goal.name} is moving well`,
          text: 'Your savings progress looks healthy so far.',
          tone: 'good',
        });
      }
    });

    this.recommendationsSubject.next(recommendations);
  }
}
