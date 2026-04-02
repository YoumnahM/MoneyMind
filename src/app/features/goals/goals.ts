import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ToastrService } from 'ngx-toastr';

import { Goal, GoalRecommendation } from '../../model/goals.model';
import { FinanceTransaction } from '../../model/transactions.model';
import { TransactionService } from '../../services/transaction.service';
import { GoalsService } from '../../services/goal.service';
import { faIcons } from '../../icons/fontawesome-icons';

type GoalInput = Omit<Goal, 'id'>;
type GoalStatus = 'completed' | 'on-track' | 'needs-attention';
type GoalStatusFilter = 'all' | GoalStatus;
type GoalSortOption = 'deadline' | 'progress-high' | 'progress-low' | 'target-high' | 'name';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './goals.html',
  styleUrls: ['./goals.css'],
})
export class Goals implements OnInit, OnDestroy {
  private readonly subscription = new Subscription();

  readonly icons = faIcons;

  readonly categories: string[] = [
    'Emergency',
    'Tech',
    'Travel',
    'Education',
    'Home',
    'Lifestyle',
    'Transport',
    'Health',
    'Other',
  ];

  goals: Goal[] = [];
  filteredGoals: Goal[] = [];
  recommendations: GoalRecommendation[] = [];
  transactions: FinanceTransaction[] = [];
  contributionTotalsByGoal: Record<number, number> = {};

  isDrawerOpen = false;
  isEditMode = false;
  isCreateMode = false;
  selectedGoal: Goal | null = null;

  filters: {
    search: string;
    status: GoalStatusFilter;
    sortBy: GoalSortOption;
  } = {
    search: '',
    status: 'all',
    sortBy: 'deadline',
  };

  drawerForm: GoalInput = this.getEmptyGoalForm();

  constructor(
    private readonly goalsService: GoalsService,
    private readonly transactionService: TransactionService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.goalsService.getGoals().subscribe((goals) => {
        this.goals = goals;
        this.applyGoalFilters();
        this.refreshRecommendations();
      }),
    );

    this.subscription.add(
      this.goalsService.getRecommendations().subscribe((recommendations) => {
        this.recommendations = recommendations;
      }),
    );

    this.subscription.add(
      this.transactionService.transactions$.subscribe((transactions) => {
        this.transactions = transactions;
        this.contributionTotalsByGoal = this.goalsService.getGoalContributionTotals(transactions);
        this.applyGoalFilters();
        this.refreshRecommendations();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get activeGoalsCount(): number {
    return this.goals.filter((goal) => this.getGoalStatus(goal) !== 'completed').length;
  }

  get totalGoalSavings(): number {
    return this.goals.reduce((sum, goal) => sum + this.getSavedAmount(goal), 0);
  }

  get totalContributedFromTransactions(): number {
    return Object.values(this.contributionTotalsByGoal).reduce((sum, amount) => sum + amount, 0);
  }

  openCreateDrawer(): void {
    this.isDrawerOpen = true;
    this.isEditMode = true;
    this.isCreateMode = true;
    this.selectedGoal = null;
    this.drawerForm = this.getEmptyGoalForm();
  }

  openGoalDrawer(goal: Goal): void {
    this.selectedGoal = goal;
    this.isDrawerOpen = true;
    this.isEditMode = false;
    this.isCreateMode = false;
    this.drawerForm = this.mapGoalToForm(goal);
  }

  openEditDrawer(goal: Goal): void {
    this.selectedGoal = goal;
    this.isDrawerOpen = true;
    this.isEditMode = true;
    this.isCreateMode = false;
    this.drawerForm = this.mapGoalToForm(goal);
  }

  startEditGoal(): void {
    if (!this.selectedGoal) return;

    this.isEditMode = true;
    this.isCreateMode = false;
    this.drawerForm = this.mapGoalToForm(this.selectedGoal);
  }

  cancelEditMode(): void {
    if (this.isCreateMode) {
      this.closeDrawer();
      return;
    }

    this.isEditMode = false;

    if (this.selectedGoal) {
      this.drawerForm = this.mapGoalToForm(this.selectedGoal);
    }
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.isEditMode = false;
    this.isCreateMode = false;
    this.selectedGoal = null;
    this.drawerForm = this.getEmptyGoalForm();
  }

  saveGoalChanges(): void {
    const payload = this.buildValidatedPayload();

    if (!payload) {
      this.toastr.error('Please complete all goal fields correctly.', 'Missing Information');
      return;
    }

    if (this.isCreateMode) {
      this.goalsService.addGoal(payload);
      this.toastr.success(`${payload.name} was created successfully.`, 'Goal Created');
      this.closeDrawer();
      return;
    }

    if (!this.selectedGoal) return;

    this.goalsService.updateGoal(this.selectedGoal.id, payload);
    this.selectedGoal = { ...this.selectedGoal, ...payload };
    this.isEditMode = false;

    this.toastr.success(`${payload.name} was updated successfully.`, 'Goal Updated');
  }

  deleteGoalDirect(goal: Goal): void {
    const confirmed = window.confirm(`Delete "${goal.name}"?`);
    if (!confirmed) return;

    this.goalsService.deleteGoal(goal.id);

    if (this.selectedGoal?.id === goal.id) {
      this.closeDrawer();
    }

    this.toastr.warning(`${goal.name} was deleted.`, 'Goal Deleted');
  }

  resetGoalFilters(): void {
    this.filters = {
      search: '',
      status: 'all',
      sortBy: 'deadline',
    };

    this.applyGoalFilters();
    this.toastr.info('Goal filters have been reset.', 'Filters Cleared');
  }

  applyGoalFilters(): void {
    const search = this.filters.search.trim().toLowerCase();

    let result = [...this.goals];

    if (search) {
      result = result.filter((goal) => {
        return (
          goal.name.toLowerCase().includes(search) || goal.category.toLowerCase().includes(search)
        );
      });
    }

    if (this.filters.status !== 'all') {
      result = result.filter((goal) => this.getGoalStatus(goal) === this.filters.status);
    }

    result.sort((a, b) => this.compareGoals(a, b, this.filters.sortBy));
    this.filteredGoals = result;
  }

  trackByGoalId(_: number, goal: Goal): number {
    return goal.id;
  }

  getSavedAmount(goal: Goal): number {
    return this.goalsService.getGoalSavedAmount(goal.id, this.transactions);
  }

  getProgressPercent(goal: Goal): number {
    return this.goalsService.getGoalProgressPercentage(goal, this.transactions);
  }

  getRemainingAmount(goal: Goal): number {
    return this.goalsService.getGoalRemainingAmount(goal, this.transactions);
  }

  getContributionFromTransactions(goalId: number): number {
    return this.contributionTotalsByGoal[goalId] ?? 0;
  }

  getGoalStatus(goal: Goal): GoalStatus {
    const progress = this.getProgressPercent(goal);

    if (progress >= 100) {
      return 'completed';
    }

    const suggestedContribution = this.getSuggestedContribution(goal);

    if (suggestedContribution === 0 || goal.monthlyContribution >= suggestedContribution) {
      return 'on-track';
    }

    return 'needs-attention';
  }

  getGoalStatusLabel(goal: Goal): string {
    const status = this.getGoalStatus(goal);

    switch (status) {
      case 'completed':
        return 'Completed';
      case 'on-track':
        return 'On track';
      default:
        return 'Needs a boost';
    }
  }

  getDeadlineLabel(goal: Goal): string {
    const date = new Date(goal.deadline);

    if (Number.isNaN(date.getTime())) {
      return 'Not set';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  getProjectedCompletion(goal: Goal): string {
    const remaining = this.getRemainingAmount(goal);

    if (remaining <= 0) return 'Completed';
    if (goal.monthlyContribution <= 0) return 'Not enough monthly saving';

    const months = Math.ceil(remaining / goal.monthlyContribution);
    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + months);

    return projectedDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  getSuggestedContribution(goal: Goal): number {
    const remaining = this.getRemainingAmount(goal);
    const deadline = new Date(goal.deadline);

    if (remaining <= 0 || Number.isNaN(deadline.getTime())) {
      return 0;
    }

    const today = new Date();

    const monthsLeft =
      (deadline.getFullYear() - today.getFullYear()) * 12 +
      (deadline.getMonth() - today.getMonth());

    if (monthsLeft <= 0) {
      return remaining;
    }

    return Math.ceil(remaining / monthsLeft);
  }

  private getEmptyGoalForm(): GoalInput {
    return {
      name: '',
      targetAmount: 0,
      monthlyContribution: 0,
      deadline: '',
      category: 'Other',
    };
  }

  private mapGoalToForm(goal: Goal): GoalInput {
    return {
      name: goal.name,
      targetAmount: goal.targetAmount,
      monthlyContribution: goal.monthlyContribution,
      deadline: goal.deadline,
      category: goal.category,
    };
  }

  private buildValidatedPayload(): GoalInput | null {
    const name = this.drawerForm.name.trim();
    const targetAmount = Number(this.drawerForm.targetAmount);
    const monthlyContribution = Number(this.drawerForm.monthlyContribution);

    const isValid =
      !!name &&
      targetAmount > 0 &&
      monthlyContribution >= 0 &&
      !!this.drawerForm.deadline &&
      !!this.drawerForm.category;

    if (!isValid) return null;

    return {
      name,
      targetAmount,
      monthlyContribution,
      deadline: this.drawerForm.deadline,
      category: this.drawerForm.category,
    };
  }

  private compareGoals(a: Goal, b: Goal, sortBy: GoalSortOption): number {
    switch (sortBy) {
      case 'progress-high':
        return this.getProgressPercent(b) - this.getProgressPercent(a);

      case 'progress-low':
        return this.getProgressPercent(a) - this.getProgressPercent(b);

      case 'target-high':
        return b.targetAmount - a.targetAmount;

      case 'name':
        return a.name.localeCompare(b.name);

      case 'deadline':
      default:
        return this.compareDeadlines(a.deadline, b.deadline);
    }
  }

  private compareDeadlines(a: string, b: string): number {
    const aTime = new Date(a).getTime();
    const bTime = new Date(b).getTime();

    const aValid = !Number.isNaN(aTime);
    const bValid = !Number.isNaN(bTime);

    if (aValid && bValid) return aTime - bTime;
    if (aValid) return -1;
    if (bValid) return 1;
    return 0;
  }

  private refreshRecommendations(): void {
    const recommendations: GoalRecommendation[] = [];

    if (!this.goals.length) {
      recommendations.push({
        title: 'Start your first savings goal',
        text: 'Create a goal to track your progress and stay focused.',
        tone: 'tip',
      });

      this.goalsService.setRecommendations(recommendations);
      return;
    }

    this.goals.forEach((goal) => {
      const savedAmount = this.getSavedAmount(goal);
      const progress = this.getProgressPercent(goal);
      const suggestedContribution = this.getSuggestedContribution(goal);
      const remaining = this.getRemainingAmount(goal);

      if (progress >= 100) {
        recommendations.push({
          title: `${goal.name} is completed`,
          text: 'Great job. You reached this goal successfully.',
          tone: 'good',
        });
        return;
      }

      if (savedAmount > 0 && progress >= 50) {
        recommendations.push({
          title: `${goal.name} is moving well`,
          text: `${this.formatCurrency(savedAmount)} has been contributed through linked transactions.`,
          tone: 'good',
        });
        return;
      }

      if (savedAmount === 0) {
        recommendations.push({
          title: `Start funding ${goal.name}`,
          text: 'Add a goal contribution transaction to begin making progress.',
          tone: 'tip',
        });
        return;
      }

      if (goal.monthlyContribution < suggestedContribution && remaining > 0) {
        recommendations.push({
          title: `${goal.name} needs a little more each month`,
          text: `Try setting aside about ${this.formatCurrency(suggestedContribution)} per month to stay on track.`,
          tone: 'watch',
        });
        return;
      }

      recommendations.push({
        title: `${goal.name} is on track`,
        text: 'Your current pace looks healthy for this goal.',
        tone: 'good',
      });
    });

    this.goalsService.setRecommendations(recommendations.slice(0, 6));
  }

  private formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString()}`;
  }
}
