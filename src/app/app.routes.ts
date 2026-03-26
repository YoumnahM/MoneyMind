import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
   children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(
            (m) => m.Dashboard
          ),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./features/transactions/transactions').then(
            (m) => m.Transactions
          ),
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('./features/insights/insights').then(
            (m) => m.Insights
          ),
      },
      {
        path: 'simulator',
        loadComponent: () =>
          import('./features/simulator/simulator').then(
            (m) => m.Simulator
          ),
      },
      {
        path: 'goals',
        loadComponent: () =>
          import('./features/goals/goals').then(
            (m) => m.Goals
          ),
      },
    ],
  },

  // Optional: fallback route
  {
    path: '**',
    redirectTo: '',
  },
];
