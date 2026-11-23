import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { Shell } from './core/layout/shell';

export const routes: Routes = [
  {
    path: 'entrar',
    title: 'Entrar · Carteira B3',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'cadastro',
    title: 'Criar conta · Carteira B3',
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    component: Shell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'carteiras' },
      {
        path: 'carteiras',
        title: 'Carteiras · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/portfolios/portfolios-page').then((m) => m.PortfoliosPage),
      },
      {
        path: 'carteiras/:id',
        title: 'Carteira · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/portfolios/portfolio-detail-page').then((m) => m.PortfolioDetailPage),
      },
      {
        path: 'carteiras/:id/historico',
        title: 'Histórico · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/operations/operation-history-page').then(
            (m) => m.OperationHistoryPage,
          ),
      },
      {
        path: 'carteiras/:id/operacoes/nova',
        title: 'Lançar operação · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/operations/operation-form-page').then((m) => m.OperationFormPage),
      },
      {
        path: 'carteiras/:id/operacoes/:operationId/editar',
        title: 'Editar operação · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/operations/operation-form-page').then((m) => m.OperationFormPage),
      },
      {
        path: 'ativos',
        title: 'Ativos · Carteira B3',
        canActivate: [authGuard],
        loadComponent: () => import('./features/assets/assets-page').then((m) => m.AssetsPage),
      },
      {
        path: '**',
        title: 'Página não encontrada · Carteira B3',
        loadComponent: () => import('./core/layout/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
