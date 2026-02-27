import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { UserService, UserResponse, UserStats } from '../../core/services/user.service';
import { Role } from '../../core/models/auth.models';
import { EditUserDialogComponent } from '../../shared/components/edit-user-dialog/edit-user-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  // ── User list ─────────────────────────────────────────────────────────────
  dataSource = new MatTableDataSource<UserResponse>();
  displayedColumns = ['username', 'email', 'role', 'status', 'createdAt', 'actions'];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  loadingUsers = false;
  stats: UserStats | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ── Create form ───────────────────────────────────────────────────────────
  createForm: FormGroup;
  creating = false;
  hidePassword = true;
  successMessage = '';

  permissionRows = [
    { feature: 'POS / Cashier',    admin: true,  manager: true,  cashier: true  },
    { feature: 'Orders',           admin: true,  manager: true,  cashier: true  },
    { feature: 'Customers',        admin: true,  manager: true,  cashier: true  },
    { feature: 'Products',         admin: true,  manager: true,  cashier: false },
    { feature: 'Categories',       admin: true,  manager: true,  cashier: false },
    { feature: 'Inventory',        admin: true,  manager: true,  cashier: false },
    { feature: 'Reports',          admin: true,  manager: true,  cashier: false },
    { feature: 'User Management',  admin: true,  manager: false, cashier: false },
    { feature: 'Delete Records',   admin: true,  manager: false, cashier: false },
  ];

  roles: { value: Role; label: string; description: string }[] = [
    { value: 'ADMIN',   label: 'Admin',   description: 'Full access — manage users, products, reports, settings' },
    { value: 'MANAGER', label: 'Manager', description: 'Manage products, categories, inventory, view reports' },
    { value: 'CASHIER', label: 'Cashier', description: 'POS cashier screen and order processing only' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.createForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role:     ['CASHIER', Validators.required]
    });
  }

  ngOnInit(): void { this.loadUsers(0); this.loadStats(); }

  loadStats(): void {
    this.userService.getStats().subscribe({ next: res => { this.stats = res.data ?? null; } });
  }

  loadUsers(page = 0): void {
    this.loadingUsers = true;
    this.pageIndex = page;
    this.userService.getAll(page, this.pageSize).subscribe({
      next: res => {
        this.dataSource.data = res.data?.content || [];
        this.totalElements = res.data?.totalElements ?? 0;
        this.loadingUsers = false;
      },
      error: () => { this.loadingUsers = false; }
    });
  }

  onPage(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.loadUsers(e.pageIndex);
  }

  /** Reset to first page and reload (e.g. after create/edit/toggle). */
  refreshUsers(): void {
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadUsers(0);
  }

  openEdit(user: UserResponse): void {
    this.dialog.open(EditUserDialogComponent, {
      data: { user, adminMode: true },
      width: '680px',
      disableClose: true
    }).afterClosed().subscribe(updated => {
      if (updated) { this.refreshUsers(); this.loadStats(); }
    });
  }

  toggleActive(user: UserResponse): void {
    const action = user.active ? 'Deactivate' : 'Activate';
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `${action} User`,
        message: `${action} account for "${user.username}"?`,
        confirmText: action
      }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.userService.toggleActive(user.id).subscribe({
        next: () => { this.snackBar.open(`User ${action.toLowerCase()}d`, 'Close', { duration: 3000 }); this.refreshUsers(); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  submit(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid) return;
    this.creating = true;
    this.successMessage = '';

    this.authService.register(this.createForm.value).subscribe({
      next: res => {
        this.creating = false;
        this.successMessage = `User "${res.data.username}" created with role ${res.data.role}.`;
        this.createForm.reset({ role: 'CASHIER' });
        this.createForm.markAsUntouched();
        this.snackBar.open(this.successMessage, 'Close', { duration: 5000 });
        this.refreshUsers();
        this.loadStats();
      },
      error: err => {
        this.creating = false;
        this.snackBar.open(err.error?.message || 'Failed to create user', 'Close', { duration: 4000 });
      }
    });
  }

  roleClass(role: string): string {
    return { ADMIN: 'chip-admin', MANAGER: 'chip-manager', CASHIER: 'chip-cashier' }[role] || '';
  }

  getError(field: string): string {
    const ctrl = this.createForm.get(field);
    if (!ctrl?.touched) return '';
    if (ctrl.hasError('required'))  return `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
    if (ctrl.hasError('minlength')) return `Minimum ${ctrl.errors?.['minlength'].requiredLength} characters`;
    if (ctrl.hasError('maxlength')) return `Maximum ${ctrl.errors?.['maxlength'].requiredLength} characters`;
    if (ctrl.hasError('email'))     return 'Invalid email format';
    return '';
  }

  get currentUsername(): string { return this.authService.getUsername() || ''; }

}
