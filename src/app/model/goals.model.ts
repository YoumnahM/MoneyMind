export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  monthlyContribution: number;
  deadline: string;
  category: string;
}

export interface GoalRecommendation {
  title: string;
  text: string;
  tone: 'good' | 'watch' | 'tip';
}