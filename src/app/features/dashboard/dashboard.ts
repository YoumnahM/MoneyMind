import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import { faIcons } from '../../icons/fontawesome-icons';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FontAwesomeModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  icons = faIcons;

  stats = [
    {
      title: 'Total Balance',
      value: 'Rs 84,500',
      change: '+12.4%',
      positive: true,
      icon: this.icons.wallet,
      theme: 'blue',
    },
    {
      title: 'Income',
      value: 'Rs 26,700',
      change: '+5.6%',
      positive: true,
      icon: this.icons.dashboard,
      theme: 'green',
    },
    {
      title: 'Expenses',
      value: 'Rs 18,240',
      change: '-4.1%',
      positive: false,
      icon: this.icons.transactions,
      theme: 'orange',
    },
    {
      title: 'Saved This Month',
      value: 'Rs 9,320',
      change: '+8.9%',
      positive: true,
      icon: this.icons.goal,
      theme: 'purple',
    },
  ];

  insights = [
    {
      title: 'Dining spending is trending up',
      text: 'You spent 18% more on dining compared to last month, especially on weekends.',
      tag: 'Trend',
    },
    {
      title: 'Savings momentum is strong',
      text: 'You are on track to exceed your monthly savings target by Rs 2,100.',
      tag: 'Positive',
    },
    {
      title: 'Transport is more stable',
      text: 'Your transport spending is becoming more consistent compared to last month.',
      tag: 'Stable',
    },
  ];

  topCategories = [
    {
      name: 'Dining',
      amount: 'Rs 6,240',
      progress: 78,
    },
    {
      name: 'Transport',
      amount: 'Rs 3,180',
      progress: 52,
    },
    {
      name: 'Shopping',
      amount: 'Rs 4,420',
      progress: 64,
    },
    {
      name: 'Bills',
      amount: 'Rs 2,980',
      progress: 45,
    },
  ];

  spendingChartType: 'line' = 'line';

  spendingChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [4200, 5100, 3960, 4980],
        label: 'Expenses',
        tension: 0.4,
        fill: true,
      },
      {
        data: [6200, 6400, 6100, 6700],
        label: 'Income',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  spendingChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9aa6b2',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9aa6b2',
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
}
