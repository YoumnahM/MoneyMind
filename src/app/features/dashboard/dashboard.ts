import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

import { DashboardService } from '../../services/dashboard.service';
import { StatCard, InsightItem, TopCategory, HealthScore } from '../../model/dashboard.model';
import { Goal } from '../../model/goals.model';
import { GoalsService } from '../../services/goal.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  stats: StatCard[] = [];
  insights: InsightItem[] = [];
  topCategories: TopCategory[] = [];
  goals: Goal[] = [];
  latestGoal: Goal | null = null;

  healthScore: HealthScore = {
    score: 0,
    label: 'No data yet',
    status: 'critical',
  };

  spendingChartType: 'line' = 'line';

  spendingChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  spendingChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#9aa6b2',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    elements: {
      line: {
        tension: 0.35,
      },
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9aa6b2',
          maxRotation: 0,
          autoSkip: true,
        },
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
      y: {
        ticks: {
          color: '#9aa6b2',
        },
        grid: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
    },
  };

  constructor(
    private dashboardService: DashboardService,
    private goalsService: GoalsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.dashboardService.getStats().subscribe((data) => {
        this.stats = data;
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getInsights().subscribe((data) => {
        this.insights = data;
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getTopCategories().subscribe((data) => {
        this.topCategories = data;
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getSpendingChartData().subscribe((data) => {
        this.spendingChartData = data;
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getHealthScore().subscribe((data) => {
        this.healthScore = data;
      }),
    );

    this.subscriptions.add(
      this.goalsService.getGoals().subscribe((goals) => {
        this.goals = goals;
        this.latestGoal = this.getLatestGoal(goals);
      }),
    );

    this.updateChartOptionsForViewport();
    window.addEventListener('resize', this.updateChartOptionsForViewport);
  }

  get healthScoreCircumference(): number {
    return 2 * Math.PI * 54;
  }

  get healthScoreOffset(): number {
    const progress = this.healthScore.score / 100;
    return this.healthScoreCircumference * (1 - progress);
  }

  private getLatestGoal(goals: Goal[]): Goal | null {
    if (!goals.length) return null;
    return [...goals].sort((a, b) => b.id - a.id)[0];
  }

  getGoalProgress(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  }

  getGoalRemaining(goal: Goal): number {
    return Math.max(goal.targetAmount - goal.savedAmount, 0);
  }

  getGoalStatus(goal: Goal): string {
    const progress = this.getGoalProgress(goal);

    if (progress >= 100) return 'Completed';
    if (progress >= 75) return 'On track';
    if (progress >= 40) return 'In progress';
    return 'Needs attention';
  }

  isGoalPositive(goal: Goal): boolean {
    const status = this.getGoalStatus(goal);
    return status === 'Completed' || status === 'On track';
  }

  formatCurrency(amount: number): string {
    return `Rs ${amount.toLocaleString()}`;
  }

  formatDeadline(deadline: string): string {
    const date = new Date(deadline);

    if (isNaN(date.getTime())) {
      return 'Not set';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  goToInsights(): void {
    this.router.navigate(['/insights']);
  }

  goToSimulator(): void {
    this.router.navigate(['/simulator']);
  }

  goToGoals(): void {
    this.router.navigate(['/goals']);
  }

  private updateChartOptionsForViewport = (): void => {
    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 900;

    this.spendingChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: !isMobile,
          labels: {
            color: '#9aa6b2',
            boxWidth: isMobile ? 8 : 12,
            boxHeight: isMobile ? 8 : 12,
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      elements: {
        line: {
          tension: 0.35,
        },
        point: {
          radius: isMobile ? 0 : isTablet ? 2 : 3,
          hoverRadius: isMobile ? 2 : 5,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#9aa6b2',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: isMobile ? 4 : isTablet ? 6 : 8,
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
          },
        },
        y: {
          ticks: {
            color: '#9aa6b2',
            maxTicksLimit: isMobile ? 4 : 6,
          },
          grid: {
            color: 'rgba(255,255,255,0.05)',
          },
        },
      },
    };
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateChartOptionsForViewport);
    this.subscriptions.unsubscribe();
  }
}
