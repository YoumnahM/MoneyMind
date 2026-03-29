import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface StatCard {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: IconDefinition;
  theme: 'blue' | 'green' | 'orange' | 'purple';
}

export interface InsightItem {
  title: string;
  text: string;
  tag: string;
}

export interface TopCategory {
  name: string;
  amount: string;
  progress: number;
}

export interface HealthScore {
  score: number;
  label: string;
  status: 'excellent' | 'good' | 'watch' | 'critical';
}