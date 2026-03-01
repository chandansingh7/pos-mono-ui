import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { ChangePasswordDialogComponent } from '../../shared/components/change-password-dialog/change-password-dialog.component';
import { EditUserDialogComponent } from '../../shared/components/edit-user-dialog/edit-user-dialog.component';
import { UserService } from '../../core/services/user.service';
import { Subscription } from 'rxjs';
import { CompanyResponse } from '../../core/models/company.models';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
  managerPlus?: boolean;
}

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit, OnDestroy {
  username = '';
  role = '';
  sidenavOpened = true;
  company: CompanyResponse | null = null;
  private companySub?: Subscription;

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/app/dashboard' },
    { label: 'POS / Cashier', icon: 'point_of_sale', route: '/app/pos' },
    { label: 'Orders', icon: 'receipt_long', route: '/app/orders' },
    { label: 'Products', icon: 'inventory_2', route: '/app/products' },
    { label: 'Categories', icon: 'category', route: '/app/categories', managerPlus: true },
    { label: 'Customers', icon: 'people', route: '/app/customers' },
    { label: 'Inventory', icon: 'warehouse', route: '/app/inventory', managerPlus: true },
    { label: 'Reports', icon: 'bar_chart', route: '/app/reports', managerPlus: true },
    { label: 'Billing', icon: 'receipt', route: '/app/billing', managerPlus: true },
    { label: 'Settings', icon: 'business', route: '/app/settings', adminOnly: true },
    { label: 'Users', icon: 'manage_accounts', route: '/app/users', adminOnly: true },
  ];

  constructor(
    private authService: AuthService,
    private companyService: CompanyService,
    private router: Router,
    private dialog: MatDialog,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';
    this.role = this.authService.getRole() || '';
    this.companySub = this.companyService.company$.subscribe(c => { this.company = c; });
    this.companyService.get().subscribe();
  }

  ngOnDestroy(): void {
    this.companySub?.unsubscribe();
  }

  get logoImageUrl(): string | null {
    const base = resolveProductImageUrl(this.company?.logoUrl);
    if (!base) return null;
    if (this.company?.updatedAt) {
      const v = new Date(this.company.updatedAt).getTime();
      return `${base}${base.includes('?') ? '&' : '?'}v=${v}`;
    }
    return base;
  }

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (item.adminOnly) return this.authService.isAdmin();
      if (item.managerPlus) return this.authService.isAdminOrManager();
      return true;
    });
  }

  openEditProfile(): void {
    this.userService.getMe().subscribe({
      next: res => {
        this.dialog.open(EditUserDialogComponent, {
          data: { user: res.data, adminMode: false },
          width: '680px',
          disableClose: true
        }).afterClosed().subscribe(updated => {
          if (updated) this.username = updated.email; // reflect change in sidebar
        });
      }
    });
  }

  openChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '440px', disableClose: true });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
