import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChartType, ChartData, ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { TrendMetric, HabitInsight, AlertItem, WeekPattern, CategoryGrowth } from '../../model/insights.model';

@Component({
  selector: 'app-insights',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './insights.html',
  styleUrl: './insights.css',
})
export class Insights {
  trendMetrics: TrendMetric[] = [
    {
      label: 'Monthly spend',
      value: 'Rs 18,420',
      change: '-8.4%',
      positive: true,
    },
    {
      label: 'Savings rate',
      value: '24%',
      change: '+3.1%',
      positive: true,
    },
    {
      label: 'Impulse purchases',
      value: '11',
      change: '-2',
      positive: true,
    },
    {
      label: 'Bills consistency',
      value: '91%',
      change: '+5%',
      positive: true,
    },
  ];

  detectedHabits: HabitInsight[] = [
    {
      tag: 'Healthy pattern',
      title: 'You are spending less during weekdays',
      text: 'Your weekday discretionary spending dropped compared with the previous month, which usually supports better end-of-month cash stability.',
      tone: 'good',
    },
    {
      tag: 'Recurring behavior',
      title: 'Subscriptions are staying stable',
      text: 'Recurring digital expenses remained predictable, making your fixed-cost pattern easier to manage and forecast.',
      tone: 'neutral',
    },
    {
      tag: 'Watch closely',
      title: 'Short weekend food spikes are reappearing',
      text: 'Weekend food and entertainment purchases tend to cluster in short bursts, which can quietly eat into your savings buffer.',
      tone: 'watch',
    },
  ];

  alerts: AlertItem[] = [
    {
      title: 'Food spending spike detected',
      text: 'This category rose above your recent 4-week average and may continue trending upward if repeated next weekend.',
      severity: 'high',
      amount: '+Rs 2,150',
    },
    {
      title: 'Transport spend unusually low',
      text: 'Transport dropped sharply compared with your recent baseline. This may simply reflect fewer commute days.',
      severity: 'low',
      amount: '-Rs 850',
    },
    {
      title: 'Entertainment pattern changed',
      text: 'Entertainment purchases happened earlier in the month than usual, which may shift how your remaining monthly budget behaves.',
      severity: 'medium',
    },
  ];

  weekdayWeekendData: WeekPattern[] = [
    {
      label: 'Average weekday spend',
      value: 'Rs 620',
      note: 'Mostly essentials and transport',
    },
    {
      label: 'Average weekend spend',
      value: 'Rs 1,240',
      note: 'Driven by food and leisure',
    },
    {
      label: 'Weekend variance',
      value: '+100%',
      note: 'Weekend spending is twice as high',
    },
    {
      label: 'Best control day',
      value: 'Tuesday',
      note: 'Lowest discretionary pattern',
    },
  ];

  categoryGrowth: CategoryGrowth[] = [
    {
      name: 'Food',
      change: 18,
      amount: 'Rs 6,200',
      direction: 'up',
    },
    {
      name: 'Transport',
      change: -9,
      amount: 'Rs 2,100',
      direction: 'down',
    },
    {
      name: 'Entertainment',
      change: 14,
      amount: 'Rs 2,950',
      direction: 'up',
    },
    {
      name: 'Bills',
      change: 3,
      amount: 'Rs 4,300',
      direction: 'up',
    },
    {
      name: 'Shopping',
      change: -11,
      amount: 'Rs 1,780',
      direction: 'down',
    },
  ];

  trendChartType: 'line' = 'line';

  trendChartData: ChartData<'line'> = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'Spending',
        data: [5400, 4800, 5100, 4300, 3900, 3720],
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#7dd3fc',
        pointBorderColor: '#0c111d',
        pointBorderWidth: 2,
        borderColor: 'rgba(125, 211, 252, 0.95)',
        backgroundColor: 'rgba(125, 211, 252, 0.12)',
      },
    ],
  };

  trendChartOptions: ChartConfiguration<'line'>['options'] = {
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
            return ` Rs ${value.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#9aa6b2',
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9aa6b2',
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

  weekdayChartType: 'bar' = 'bar';

  weekdayChartData: ChartData<'bar'> = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Average spend',
        data: [540, 480, 610, 590, 880, 1320, 1160],
        borderRadius: 10,
        maxBarThickness: 34,
        backgroundColor: [
          'rgba(125, 211, 252, 0.65)',
          'rgba(125, 211, 252, 0.65)',
          'rgba(125, 211, 252, 0.65)',
          'rgba(125, 211, 252, 0.65)',
          'rgba(125, 211, 252, 0.65)',
          'rgba(252, 211, 77, 0.75)',
          'rgba(167, 243, 208, 0.75)',
        ],
      },
    ],
  };

  weekdayChartOptions: ChartConfiguration<'bar'>['options'] = {
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
            return ` Rs ${value.toLocaleString()}`;
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

  get growthTrackStyle() {
    const max = Math.max(...this.categoryGrowth.map((item) => Math.abs(item.change)));
    return (value: number) => `${(Math.abs(value) / max) * 100}%`;
  }
}
