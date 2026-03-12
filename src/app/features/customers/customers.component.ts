import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CustomerService } from '../../core/services/customer.service';
import { AuthService } from '../../core/services/auth.service';
import { CustomerResponse } from '../../core/models/customer.models';
import { CustomerDialogComponent } from './customer-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MemberCardDialogComponent } from '../../shared/components/member-card-dialog/member-card-dialog.component';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss']
})
export class CustomersComponent implements OnInit {
  dataSource = new MatTableDataSource<CustomerResponse>();
  displayedColumns = ['name', 'email', 'phone', 'rewardPoints', 'createdAt', 'updatedAt', 'actions'];

  totalElements = 0;
  pageSize = 10;
  loading = false;
  searchControl = new FormControl('');
  stats: { total: number } | null = null;

  filters = new FormGroup({
    name:      new FormControl(''),
    email:     new FormControl(''),
    phone:     new FormControl(''),
    createdAt: new FormControl(''),
    updatedAt: new FormControl(''),
  });

  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Default: newest customers first
    this.sortCol = 'updatedAt';
    this.sortDir = 'desc';
    this.setupFilterPredicate();
    this.load();
    this.loadStats();
    this.searchControl.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load(0));
    this.filters.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyColumnFilters());
  }

  loadStats(): void {
    this.customerService.getStats().subscribe({ next: res => { this.stats = res.data ?? null; } });
  }

  sortBy(col: string): void {
    this.sortDir = this.sortCol === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortCol = col;
    this.applySort();
  }

  sortIcon(col: string): string {
    if (this.sortCol !== col) return 'swap_vert';
    return this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  private applySort(): void {
    if (!this.sortCol) return;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    this.dataSource.data = [...this.dataSource.data].sort((a, b) => {
      const va = ((a as any)[this.sortCol] ?? '').toString().toLowerCase();
      const vb = ((b as any)[this.sortCol] ?? '').toString().toLowerCase();
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (row: CustomerResponse, filter: string) => {
      const f = JSON.parse(filter);
      return [
        this.contains(row.name, f.name),
        this.contains(row.email, f.email),
        this.contains(row.phone, f.phone),
        this.contains(row.createdAt, f.createdAt),
        this.contains(row.updatedAt, f.updatedAt),
      ].every(Boolean);
    };
  }

  private contains(value: string | null | undefined, filter: string): boolean {
    if (!filter) return true;
    return (value ?? '').toString().toLowerCase().includes(filter.toLowerCase());
  }

  private applyColumnFilters(): void {
    const v = this.filters.value;
    this.dataSource.filter = JSON.stringify({
      name:      v.name      || '',
      email:     v.email     || '',
      phone:     v.phone     || '',
      createdAt: v.createdAt || '',
      updatedAt: v.updatedAt || '',
    });
  }

  load(page = 0): void {
    this.loading = true;
    this.customerService.getAll(this.searchControl.value || '', page, this.pageSize).subscribe({
      next: res => {
        this.dataSource.data = res.data?.content || [];
        this.totalElements   = res.data?.totalElements || 0;
        this.loading = false;
        this.applyColumnFilters();
        this.applySort();
      },
      error: () => { this.loading = false; }
    });
  }

  onPage(e: PageEvent): void { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  openDialog(customer?: CustomerResponse): void {
    const ref = this.dialog.open(CustomerDialogComponent, { data: customer || null, width: '440px' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const call = customer ? this.customerService.update(customer.id, result) : this.customerService.create(result);
      call.subscribe({
        next: () => { this.snackBar.open('Customer saved!', 'Close', { duration: 3000 }); this.load(); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  viewOrders(customer: CustomerResponse): void {
    this.router.navigate(['/app/orders'], { queryParams: { customer: customer.name } });
  }

  openMemberCard(customer: CustomerResponse): void {
    const openDialog = (c: CustomerResponse) => {
      this.dialog.open(MemberCardDialogComponent, {
        data: { customer: c },
        width: '380px'
      }).afterClosed().subscribe(() => this.load());
    };
    if (customer.memberCardBarcode) {
      openDialog(customer);
    } else {
      this.customerService.createMemberCard(customer.id).subscribe({
        next: res => {
          if (res.data) openDialog(res.data);
          else this.snackBar.open('Could not create card', 'Close', { duration: 3000 });
        },
        error: err => this.snackBar.open(err.error?.message || 'Error creating card', 'Close', { duration: 4000 })
      });
    }
  }

  delete(customer: CustomerResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Customer', message: `Delete "${customer.name}"?`, confirmText: 'Delete' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.customerService.delete(customer.id).subscribe({
        next: () => { this.snackBar.open('Deleted', 'Close', { duration: 3000 }); this.load(); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  clearFilters(): void { this.filters.reset(); this.searchControl.reset(); }

  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

}
