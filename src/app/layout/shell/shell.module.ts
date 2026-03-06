import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { SharedModule } from '../../shared/shared.module';
import { ShellComponent } from './shell.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { DashboardGuard } from '../../core/guards/dashboard.guard';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            canActivate: [DashboardGuard],
            loadChildren: () => import('../../features/dashboard/dashboard.module').then(m => m.DashboardModule)
          },
      { path: 'pos', loadChildren: () => import('../../features/pos/pos.module').then(m => m.PosModule) },
      { path: 'products', loadChildren: () => import('../../features/products/products.module').then(m => m.ProductsModule) },
      { path: 'categories', loadChildren: () => import('../../features/categories/categories.module').then(m => m.CategoriesModule) },
      { path: 'customers', loadChildren: () => import('../../features/customers/customers.module').then(m => m.CustomersModule) },
      { path: 'orders', loadChildren: () => import('../../features/orders/orders.module').then(m => m.OrdersModule) },
      { path: 'inventory', loadChildren: () => import('../../features/inventory/inventory.module').then(m => m.InventoryModule) },
      { path: 'reports', loadChildren: () => import('../../features/reports/reports.module').then(m => m.ReportsModule) },
      { path: 'billing', loadChildren: () => import('../../features/billing/billing.module').then(m => m.BillingModule) },
      { path: 'labels', loadChildren: () => import('../../features/labels/labels.module').then(m => m.LabelsModule) },
      { path: 'rewards', loadChildren: () => import('../../features/rewards/rewards.module').then(m => m.RewardsModule) },
      { path: 'guide', loadChildren: () => import('../../features/guide/guide.module').then(m => m.GuideModule) },
      { path: 'settings', loadChildren: () => import('../../features/settings/settings.module').then(m => m.SettingsModule) },
      { path: 'users', loadChildren: () => import('../../features/users/users.module').then(m => m.UsersModule) },
          { path: 'access-logs', loadChildren: () => import('../../features/access-logs/access-logs.module').then(m => m.AccessLogsModule) },
      { path: 'backup', loadChildren: () => import('../../features/backup/backup.module').then(m => m.BackupModule) },
      { path: 'shifts', loadChildren: () => import('../../features/shifts/shifts.module').then(m => m.ShiftsModule) },
      { path: 'my-shift', loadChildren: () => import('../../features/shifts/shifts.module').then(m => m.ShiftsModule) },
      { path: 'shift', redirectTo: 'shifts', pathMatch: 'full' },
    ]
  }
];

@NgModule({
  declarations: [ShellComponent],
  imports: [
    SharedModule, MatSidenavModule, MatToolbarModule, MatListModule,
    RouterModule.forChild(routes)
  ]
})
export class ShellModule {}
