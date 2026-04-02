import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subscription } from 'rxjs';

import {
  AlertItem,
  CategoryGrowth,
  HabitInsight,
  TrendMetric,
  WeekPattern,
} from '../../model/insights.model';
import { InsightsService } from '../../services/insights.service';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './insights.html',
  styleUrl: './insights.css',
})
export class Insights implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  hasTransactions = false;

  trendMetrics: TrendMetric[] = [];
  detectedHabits: HabitInsight[] = [];
  alerts: AlertItem[] = [];
  weekdayWeekendData: WeekPattern[] = [];
  categoryGrowth: CategoryGrowth[] = [];

  trendChartType: 'line' = 'line';
  weekdayChartType: 'bar' = 'bar';

  trendChartData: ChartData<'line'> = {
    labels: [],
    datasets: [],
  };

  weekdayChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [],
  };

  trendChartOptions: ChartConfiguration<'line'>['options'] = {};
  weekdayChartOptions: ChartConfiguration<'bar'>['options'] = {};

  constructor(private readonly insightsService: InsightsService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.insightsService.hasTransactions().subscribe((hasData) => {
        this.hasTransactions = hasData;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getTrendMetrics().subscribe((data) => {
        this.trendMetrics = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getDetectedHabits().subscribe((data) => {
        this.detectedHabits = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getAlerts().subscribe((data) => {
        this.alerts = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getWeekPatterns().subscribe((data) => {
        this.weekdayWeekendData = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getCategoryGrowth().subscribe((data) => {
        this.categoryGrowth = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getTrendChartData().subscribe((data) => {
        this.trendChartData = data;
      }),
    );

    this.subscriptions.add(
      this.insightsService.getWeekdayChartData().subscribe((data) => {
        this.weekdayChartData = data;
      }),
    );

    this.updateChartOptionsForViewport();
    window.addEventListener('resize', this.updateChartOptionsForViewport);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateChartOptionsForViewport);
    this.subscriptions.unsubscribe();
  }

  get growthTrackStyle() {
    const max = Math.max(...this.categoryGrowth.map((item) => Math.abs(item.change)), 1);
    return (value: number) => `${(Math.abs(value) / max) * 100}%`;
  }

  get hasTrendChartData(): boolean {
    return (
      Array.isArray(this.trendChartData.labels) &&
      this.trendChartData.labels.length > 0 &&
      Array.isArray(this.trendChartData.datasets) &&
      this.trendChartData.datasets.some((dataset) =>
        Array.isArray(dataset.data) && dataset.data.some((value) => Number(value) > 0),
      )
    );
  }

  get hasWeekdayChartData(): boolean {
    return (
      Array.isArray(this.weekdayChartData.datasets) &&
      this.weekdayChartData.datasets.some((dataset) =>
        Array.isArray(dataset.data) && dataset.data.some((value) => Number(value) > 0),
      )
    );
  }

  getSeverityLabel(severity: AlertItem['severity']): string {
    switch (severity) {
      case 'high':
        return 'Needs attention';
      case 'medium':
        return 'Keep an eye on it';
      default:
        return 'Small change';
    }
  }

  private updateChartOptionsForViewport = (): void => {
    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth <= 900;

    this.trendChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#e6edf6',
          bodyColor: '#9aa6b2',
          displayColors: false,
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y ?? 0;
              return `Rs ${value.toLocaleString()}`;
            },
          },
        },
      },
      elements: {
        line: {
          tension: 0.35,
        },
        point: {
          radius: isMobile ? 0 : isTablet ? 2 : 4,
          hoverRadius: isMobile ? 2 : 6,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#9aa6b2',
            autoSkip: true,
            maxTicksLimit: isMobile ? 4 : isTablet ? 5 : 6,
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: '#9aa6b2',
            maxTicksLimit: isMobile ? 4 : 6,
            callback: (value) => `Rs ${value}`,
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

    this.weekdayChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: '#e6edf6',
          bodyColor: '#9aa6b2',
          displayColors: false,
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y ?? 0;
              return `Rs ${value.toLocaleString()}`;
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
            maxTicksLimit: isMobile ? 4 : 6,
            callback: (value) => `Rs ${value}`,
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
  };
}