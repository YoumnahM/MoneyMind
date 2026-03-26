import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-simulator',
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './simulator.html',
  styleUrl: './simulator.css',
})
export class Simulator {
  monthlyIncome = 42000;
  currentGoalSaved = 38000;
  targetGoal = 60000;
  currentMonthlyGoalContribution = 7200;

  categories: ScenarioCategory[] = [
    {
      key: 'food',
      name: 'Food',
      amount: 6200,
      colorClass: 'slider-food',
      min: 0,
      max: 12000,
      step: 100
    },
    {
      key: 'transport',
      name: 'Transport',
      amount: 2100,
      colorClass: 'slider-transport',
      min: 0,
      max: 6000,
      step: 100
    },
    {
      key: 'entertainment',
      name: 'Entertainment',
      amount: 2950,
      colorClass: 'slider-entertainment',
      min: 0,
      max: 8000,
      step: 100
    },
    {
      key: 'shopping',
      name: 'Shopping',
      amount: 1780,
      colorClass: 'slider-shopping',
      min: 0,
      max: 7000,
      step: 100
    }
  ];

  scenarioValues: Record<string, number> = {
    food: 6200,
    transport: 2100,
    entertainment: 2950,
    shopping: 1780
  };

  baselineValues: Record<string, number> = {
    food: 6200,
    transport: 2100,
    entertainment: 2950,
    shopping: 1780
  };

  comparisonChartType: 'bar' = 'bar';

  get baselineTotalExpenses(): number {
    return Object.values(this.baselineValues).reduce((sum, value) => sum + value, 0);
  }

  get scenarioTotalExpenses(): number {
    return Object.values(this.scenarioValues).reduce((sum, value) => sum + value, 0);
  }

  get baselineLeftover(): number {
    return this.monthlyIncome - this.baselineTotalExpenses;
  }

  get scenarioLeftover(): number {
    return this.monthlyIncome - this.scenarioTotalExpenses;
  }

  get monthlyImprovement(): number {
    return this.scenarioLeftover - this.baselineLeftover;
  }

  get recommendedGoalContribution(): number {
    return this.currentMonthlyGoalContribution + Math.max(this.monthlyImprovement, 0);
  }

  get goalRemaining(): number {
    return Math.max(this.targetGoal - this.currentGoalSaved, 0);
  }

  get currentMonthsToGoal(): number {
    if (this.currentMonthlyGoalContribution <= 0) return 0;
    return Math.ceil(this.goalRemaining / this.currentMonthlyGoalContribution);
  }

  get projectedMonthsToGoal(): number {
    if (this.recommendedGoalContribution <= 0) return 0;
    return Math.ceil(this.goalRemaining / this.recommendedGoalContribution);
  }

  get monthsSaved(): number {
    return Math.max(this.currentMonthsToGoal - this.projectedMonthsToGoal, 0);
  }

  get currentCompletionPercent(): number {
    return Math.min((this.currentGoalSaved / this.targetGoal) * 100, 100);
  }

  get projectedCompletionNextMonthPercent(): number {
    const projectedSaved = this.currentGoalSaved + this.recommendedGoalContribution;
    return Math.min((projectedSaved / this.targetGoal) * 100, 100);
  }

  get projectedGoalMonthLabel(): string {
    const today = new Date();
    const projected = new Date(today.getFullYear(), today.getMonth() + this.projectedMonthsToGoal, 1);
    return projected.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  get currentGoalMonthLabel(): string {
    const today = new Date();
    const current = new Date(today.getFullYear(), today.getMonth() + this.currentMonthsToGoal, 1);
    return current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  }

  updateScenario(key: string, value: number): void {
    this.scenarioValues[key] = Number(value);
  }

  resetScenario(): void {
    this.scenarioValues = { ...this.baselineValues };
  }

  applySmartSaverPreset(): void {
    this.scenarioValues = {
      ...this.scenarioValues,
      food: Math.max(this.baselineValues['food'] - 800, 0),
      entertainment: Math.max(this.baselineValues['entertainment'] - 600, 0),
      shopping: Math.max(this.baselineValues['shopping'] - 500, 0)
    };
  }

  get comparisonChartData(): ChartData<'bar'> {
    return {
      labels: ['Expenses', 'Left to Save', 'Goal Contribution'],
      datasets: [
        {
          label: 'Before',
          data: [
            this.baselineTotalExpenses,
            this.baselineLeftover,
            this.currentMonthlyGoalContribution
          ],
          borderRadius: 10,
          maxBarThickness: 34,
          backgroundColor: 'rgba(125, 211, 252, 0.7)'
        },
        {
          label: 'After',
          data: [
            this.scenarioTotalExpenses,
            this.scenarioLeftover,
            this.recommendedGoalContribution
          ],
          borderRadius: 10,
          maxBarThickness: 34,
          backgroundColor: 'rgba(167, 243, 208, 0.75)'
        }
      ]
    };
  }

  comparisonChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e6edf6',
          boxWidth: 12,
          boxHeight: 12,
          useBorderRadius: true,
          borderRadius: 4
        }
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
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9aa6b2'
        },
        grid: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9aa6b2',
          callback: (value) => `Rs ${Number(value)}`
        },
        grid: {
          color: 'rgba(255,255,255,0.06)'
        },
        border: {
          display: false
        }
      }
    }
  };
}
