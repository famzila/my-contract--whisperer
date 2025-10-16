import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: '',
        redirectTo: 'upload',
        pathMatch: 'full',
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/contract-upload/contract-upload').then(
            (m) => m.ContractUpload
          ),
      },
      {
        path: 'analysis',
        loadComponent: () =>
          import('./features/analysis-dashboard/analysis-dashboard.component').then(
            (m) => m.AnalysisDashboard
          ),
      },
      {
        path: 'mock',
        loadComponent: () =>
          import('./features/mock-route/mock-route.component').then(
            (m) => m.MockRouteComponent
          ),
      },
    ],
  },
];
