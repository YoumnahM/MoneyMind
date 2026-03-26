import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Goal, GoalRecommendation } from '../../model/goals.model';

@Component({
  selector: 'app-goals',
  imports: [CommonModule, FormsModule],
  templateUrl: './goals.html',
  styleUrl: './goals.css',
})
export class Goals {
  goals: Goal[] = [
    {
      id: 1,
      name: 'Laptop Fund',
      targetAmount: 60000,
      savedAmount: 38000,
      monthlyContribution: 7200,
      deadline: '2026-09-01',
      category: 'Tech',
    },
    {
      id: 2,
      name: 'Emergency Fund',
      targetAmount: 120000,
      savedAmount: 46000,
      monthlyContribution: 9000,
      deadline: '2027-03-01',
      category: 'Safety',
    },
    {
      id: 3,
      name: 'Vacation',
      targetAmount: 45000,
      savedAmount: 12000,
      monthlyContribution: 5000,
      deadline: '2026-12-01',
      category: 'Lifestyle',
    },
  ];

  form: Omit<Goal, 'id'> = {
    name: '',
    targetAmount: 0,
    savedAmount: 0,
    monthlyContribution: 0,
    deadline: '',
    category: 'General',
  };

  calculator = {
    targetAmount: 50000,
    currentSaved: 10000,
    monthlyContribution: 4000,
  };

  recommendations: GoalRecommendation[] = [
    {
      title: 'Laptop Fund is ahead of pace',
      text: 'Your current contribution pattern keeps this goal moving steadily and puts you in a good position to finish before the target month if consistency remains high.',
      tone: 'good',
    },
    {
      title: 'Emergency Fund needs stronger monthly flow',
      text: 'This goal is large enough that even a small monthly increase could significantly reduce the completion timeline.',
      tone: 'watch',
    },
    {
      title: 'Try assigning spending leftovers to one primary goal',
      text: 'Redirecting leftover monthly cash into a single active goal can create faster visible progress and better momentum.',
      tone: 'tip',
    },
  ];

  isDrawerOpen = false;
  isEditMode = false;
  selectedGoal: Goal | null = null;

  drawerForm: Omit<Goal, 'id'> = {
    name: '',
    targetAmount: 0,
    savedAmount: 0,
    monthlyContribution: 0,
    deadline: '',
    category: 'General',
  };

  createGoal(): void {
    const trimmedName = this.form.name.trim();

    if (
      !trimmedName ||
      !this.form.targetAmount ||
      !this.form.monthlyContribution ||
      !this.form.deadline
    ) {
      return;
    }

    const newGoal: Goal = {
      id: Date.now(),
      ...this.form,
      name: trimmedName,
    };

    this.goals = [newGoal, ...this.goals];

    this.form = {
      name: '',
      targetAmount: 0,
      savedAmount: 0,
      monthlyContribution: 0,
      deadline: '',
      category: 'General',
    };
  }

  openGoalDrawer(goal: Goal): void {
    this.selectedGoal = goal;
    this.isDrawerOpen = true;
    this.isEditMode = false;
    this.drawerForm = {
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      monthlyContribution: goal.monthlyContribution,
      deadline: goal.deadline,
      category: goal.category,
    };
  }

  closeGoalDrawer(): void {
    this.isDrawerOpen = false;
    this.isEditMode = false;
    this.selectedGoal = null;
    this.resetDrawerForm();
  }

  enableEditMode(): void {
    if (!this.selectedGoal) return;

    this.drawerForm = {
      name: this.selectedGoal.name,
      targetAmount: this.selectedGoal.targetAmount,
      savedAmount: this.selectedGoal.savedAmount,
      monthlyContribution: this.selectedGoal.monthlyContribution,
      deadline: this.selectedGoal.deadline,
      category: this.selectedGoal.category,
    };

    this.isEditMode = true;
  }

  cancelEditMode(): void {
    this.isEditMode = false;

    if (this.selectedGoal) {
      this.drawerForm = {
        name: this.selectedGoal.name,
        targetAmount: this.selectedGoal.targetAmount,
        savedAmount: this.selectedGoal.savedAmount,
        monthlyContribution: this.selectedGoal.monthlyContribution,
        deadline: this.selectedGoal.deadline,
        category: this.selectedGoal.category,
      };
    }
  }

  saveGoalChanges(): void {
    if (!this.selectedGoal) return;

    const trimmedName = this.drawerForm.name.trim();

    if (
      !trimmedName ||
      !this.drawerForm.targetAmount ||
      !this.drawerForm.monthlyContribution ||
      !this.drawerForm.deadline
    ) {
      return;
    }

    this.goals = this.goals.map((goal) =>
      goal.id === this.selectedGoal!.id
        ? {
            ...goal,
            ...this.drawerForm,
            name: trimmedName,
          }
        : goal,
    );

    const updatedGoal = this.goals.find((goal) => goal.id === this.selectedGoal!.id) || null;
    this.selectedGoal = updatedGoal;
    this.isEditMode = false;
  }

  deleteSelectedGoal(): void {
    if (!this.selectedGoal) return;

    this.goals = this.goals.filter((goal) => goal.id !== this.selectedGoal!.id);
    this.closeGoalDrawer();
  }

  resetDrawerForm(): void {
    this.drawerForm = {
      name: '',
      targetAmount: 0,
      savedAmount: 0,
      monthlyContribution: 0,
      deadline: '',
      category: 'General',
    };
  }

  getProgressPercent(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  }

  getRemainingAmount(goal: Goal): number {
    return Math.max(goal.targetAmount - goal.savedAmount, 0);
  }

  getMonthsLeft(goal: Goal): number {
    const remaining = this.getRemainingAmount(goal);
    if (goal.monthlyContribution <= 0) return 0;
    return Math.ceil(remaining / goal.monthlyContribution);
  }

  getProjectedCompletion(goal: Goal): string {
    const monthsToGoal = this.getMonthsLeft(goal);
    const today = new Date();
    const completionDate = new Date(today.getFullYear(), today.getMonth() + monthsToGoal, 1);

    return completionDate.toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  getDeadlineLabel(goal: Goal): string {
    const date = new Date(goal.deadline);
    return date.toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  getGoalStatus(goal: Goal): 'on-track' | 'needs-attention' | 'completed' {
    const progress = this.getProgressPercent(goal);

    if (progress >= 100 || goal.savedAmount >= goal.targetAmount) {
      return 'completed';
    }

    const monthsToGoal = this.getMonthsLeft(goal);
    const today = new Date();
    const projectedDate = new Date(today.getFullYear(), today.getMonth() + monthsToGoal, 1);
    const deadlineDate = new Date(goal.deadline);

    return projectedDate <= deadlineDate ? 'on-track' : 'needs-attention';
  }

  getGoalStatusLabel(goal: Goal): string {
    const status = this.getGoalStatus(goal);

    if (status === 'completed') return 'Completed';
    if (status === 'on-track') return 'On track';
    return 'Needs attention';
  }

  getSuggestedContribution(goal: Goal): number {
    const remainingMonths = this.getMonthsUntilDeadline(goal);
    const remainingAmount = this.getRemainingAmount(goal);

    if (remainingMonths <= 0) return remainingAmount;
    return Math.ceil(remainingAmount / remainingMonths);
  }

  getMonthsUntilDeadline(goal: Goal): number {
    const today = new Date();
    const deadline = new Date(goal.deadline);

    const yearDiff = deadline.getFullYear() - today.getFullYear();
    const monthDiff = deadline.getMonth() - today.getMonth();

    return Math.max(yearDiff * 12 + monthDiff, 0);
  }

  getContributionGap(goal: Goal): number {
    return this.getSuggestedContribution(goal) - goal.monthlyContribution;
  }

  getCalculatorRemaining(): number {
    return Math.max(this.calculator.targetAmount - this.calculator.currentSaved, 0);
  }

  getCalculatorMonths(): number {
    if (this.calculator.monthlyContribution <= 0) return 0;
    return Math.ceil(this.getCalculatorRemaining() / this.calculator.monthlyContribution);
  }

  getCalculatorProjection(): string {
    const months = this.getCalculatorMonths();
    const today = new Date();
    const projected = new Date(today.getFullYear(), today.getMonth() + months, 1);

    return projected.toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  getCalculatorProgressPercent(): number {
    if (!this.calculator.targetAmount) return 0;
    return Math.min((this.calculator.currentSaved / this.calculator.targetAmount) * 100, 100);
  }

  trackByGoalId(index: number, goal: Goal): number {
    return goal.id;
  }
}
