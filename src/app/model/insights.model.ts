export interface TrendMetric {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

export interface HabitInsight {
  tag: string;
  title: string;
  text: string;
  tone: 'good' | 'watch' | 'neutral';
}

export interface AlertItem {
  title: string;
  text: string;
  severity: 'high' | 'medium' | 'low';
  amount?: string;
}

export interface WeekPattern {
  label: string;
  value: string;
  note: string;
}

export interface CategoryGrowth {
  name: string;
  change: number;
  amount: string;
  direction: 'up' | 'down';
  label: string;
}