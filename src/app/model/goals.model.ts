export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  deadline: string;
  category: string;
}

export interface GoalRecommendation {
  title: string;
  text: string;
  tone: 'good' | 'watch' | 'tip';
}
