import { Routes } from '@angular/router';

export const routes: Routes = [
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
];
