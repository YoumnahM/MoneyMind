import { Goal } from './goals.model';

export interface ScenarioCategory {
  key: string;
  name: string;
  amount: number;
  colorClass: string;
  min: number;
  max: number;
  step: number;
}

export interface SimulatorBaseData {
  monthlyIncome: number;
  currentGoalSaved: number;
  targetGoal: number;
  currentMonthlyGoalContribution: number;
  categories: ScenarioCategory[];
  baselineValues: Record<string, number>;
  selectedGoal: Goal | null;
  hasTransactionsThisMonth: boolean;
}