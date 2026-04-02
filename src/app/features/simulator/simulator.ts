import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { Goal } from '../../model/goals.model';
import { ScenarioCategory } from '../../model/simulator.model';
import { SimulatorService } from '../../services/simulator.service';

@Component({
  selector: 'app-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
})
export class Simulator implements OnInit, OnDestroy {
  private subscription = new Subscription();

  selectedGoal: Goal | null = null;

  monthlyIncome = 0;
  currentGoalSaved = 0;
  targetGoal = 0;
  currentMonthlyGoalContribution = 0;

  categories: ScenarioCategory[] = [];
  scenarioValues: Record<string, number> = {};
  baselineValues: Record<string, number> = {};

  hasTransactionsThisMonth = false;

  comparisonChartType: 'bar' = 'bar';
  comparisonChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [],
  };

  comparisonChartOptions: ChartConfiguration<'bar'>['options'];

  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly router: Router,
  ) {
    this.comparisonChartOptions = this.simulatorService.getComparisonChartOptions();
  }

  ngOnInit(): void {
    this.subscription.add(
      this.simulatorService.getBaseData().subscribe((data) => {
        this.selectedGoal = data.selectedGoal;
        this.monthlyIncome = data.monthlyIncome;
        this.currentGoalSaved = data.currentGoalSaved;
        this.targetGoal = data.targetGoal;
        this.currentMonthlyGoalContribution = data.currentMonthlyGoalContribution;
        this.categories = data.categories;
        this.baselineValues = { ...data.baselineValues };
        this.scenarioValues = { ...data.baselineValues };
        this.hasTransactionsThisMonth = data.hasTransactionsThisMonth;

        this.updateChart();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get currentSpending(): number {
    return Object.values(this.baselineValues).reduce((sum, value) => sum + value, 0);
  }

  get plannedSpending(): number {
    return Object.values(this.scenarioValues).reduce((sum, value) => sum + value, 0);
  }

  get currentFreeMoney(): number {
    return this.monthlyIncome - this.currentSpending;
  }

  get newFreeMoney(): number {
    return this.monthlyIncome - this.plannedSpending;
  }

  get extraSavings(): number {
    return this.newFreeMoney - this.currentFreeMoney;
  }

  get newGoalContribution(): number {
    return this.currentMonthlyGoalContribution + Math.max(this.extraSavings, 0);
  }

  get goalRemaining(): number {
    return Math.max(this.targetGoal - this.currentGoalSaved, 0);
  }

  get currentMonthsToGoal(): number {
    if (this.currentMonthlyGoalContribution <= 0) {
      return 0;
    }

    return Math.ceil(this.goalRemaining / this.currentMonthlyGoalContribution);
  }

  get newMonthsToGoal(): number {
    if (this.newGoalContribution <= 0) {
      return 0;
    }

    return Math.ceil(this.goalRemaining / this.newGoalContribution);
  }

  get monthsSaved(): number {
    return Math.max(this.currentMonthsToGoal - this.newMonthsToGoal, 0);
  }

  get currentCompletionPercent(): number {
    if (!this.targetGoal) {
      return 0;
    }

    return Math.min((this.currentGoalSaved / this.targetGoal) * 100, 100);
  }

  get projectedCompletionNextMonthPercent(): number {
    if (!this.targetGoal) {
      return 0;
    }

    const projectedSaved = this.currentGoalSaved + this.newGoalContribution;
    return Math.min((projectedSaved / this.targetGoal) * 100, 100);
  }

  get currentGoalMonthLabel(): string {
    if (!this.currentMonthsToGoal) return 'Not available';

    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth() + this.currentMonthsToGoal, 1);

    return current.toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  get projectedGoalMonthLabel(): string {
    if (!this.newMonthsToGoal) return 'Not available';

    const today = new Date();
    const projected = new Date(today.getFullYear(), today.getMonth() + this.newMonthsToGoal, 1);

    return projected.toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  get simulatorMessage(): string {
    if (!this.hasTransactionsThisMonth) {
      return 'This simulator is using sample baseline amounts because you do not have enough transactions this month yet.';
    }

    if (!this.selectedGoal) {
      return 'Adjust your monthly plan to see how much spending you could reduce and how much money you could free up.';
    }

    if (this.extraSavings > 0 && this.monthsSaved > 0) {
      return `You could free up Rs ${this.extraSavings.toLocaleString()} per month and reach ${this.selectedGoal.name} ${this.monthsSaved} month(s) sooner.`;
    }

    if (this.extraSavings > 0) {
      return `You could free up Rs ${this.extraSavings.toLocaleString()} per month for ${this.selectedGoal.name}.`;
    }

    if (this.extraSavings < 0) {
      return `This plan would leave you with Rs ${Math.abs(this.extraSavings).toLocaleString()} less each month.`;
    }

    return 'Move the sliders to test a different monthly spending plan.';
  }

  get simulatorHelperText(): string {
    if (this.hasTransactionsThisMonth) {
      return 'These amounts are based on your current month activity. Moving the sliders does not change your real transactions.';
    }

    return 'These starting amounts are sample values to help you explore the simulator before you have enough transaction data.';
  }

  updateScenario(key: string, value: number): void {
    this.scenarioValues = {
      ...this.scenarioValues,
      [key]: Number(value),
    };

    this.updateChart();
  }

  resetScenario(): void {
    this.scenarioValues = { ...this.baselineValues };
    this.updateChart();
  }

  applySmartSaverPreset(): void {
    this.scenarioValues = {
      ...this.scenarioValues,
      food: Math.max((this.baselineValues['food'] || 0) - 800, 0),
      entertainment: Math.max((this.baselineValues['entertainment'] || 0) - 600, 0),
      shopping: Math.max((this.baselineValues['shopping'] || 0) - 500, 0),
    };

    this.updateChart();
  }

  trackByCategory(index: number, category: ScenarioCategory): string {
    return category.key;
  }

  goToGoals(): void {
    this.router.navigate(['/goals']);
  }

  goToTransactions(): void {
    this.router.navigate(['/transactions']);
  }

  private updateChart(): void {
    this.comparisonChartData = this.simulatorService.getComparisonChartData(
      this.currentSpending,
      this.plannedSpending,
      this.currentFreeMoney,
      this.newFreeMoney,
      this.currentMonthlyGoalContribution,
      this.newGoalContribution,
    );
  }
}
