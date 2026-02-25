import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { InventoryService, InventoryStats } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import { InventoryResponse } from '../../core/models/inventory.models';
import { InventoryDialogComponent } from './inventory-dialog.component';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  dataSource = new MatTableDataSource<InventoryResponse>();
  lowStockItems: InventoryResponse[] = [];
  displayedColumns = ['productName', 'sku', 'quantity', 'threshold', 'status', 'updatedAt', 'actions'];

  loading = false;
  stats: InventoryStats | null = null;

  filters = new FormGroup({
    productName: new FormControl(''),
    sku:         new FormControl(''),
    quantity:    new FormControl(''),
    threshold:   new FormControl(''),
    status:      new FormControl(null),
    updatedAt:   new FormControl(''),
  });

  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Default: newest inventory changes first
    this.sortCol = 'updatedAt';
    this.sortDir = 'desc';
    this.setupFilterPredicate();
    this.load();
    this.loadStats();
    this.filters.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyColumnFilters());
  }

  refresh(): void {
    this.load();
    this.loadStats();
  }

  loadStats(): void {
    this.inventoryService.getStats().subscribe({
      next: res => {
        this.stats = res.data ?? null;
        this.cdr.detectChanges();
      }
    });
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
      let va: any, vb: any;
      switch (this.sortCol) {
        case 'sku':       va = a.productSku; vb = b.productSku; break;
        case 'threshold': va = a.lowStockThreshold ?? 0; vb = b.lowStockThreshold ?? 0; break;
        case 'status':    va = a.stockStatus; vb = b.stockStatus; break;
        case 'quantity':  va = a.quantity ?? 0; vb = b.quantity ?? 0; break;
        default:          va = (a as any)[this.sortCol]; vb = (b as any)[this.sortCol];
      }
      if (typeof va === 'number') return (va - vb) * dir;
      va = (va ?? '').toString().toLowerCase();
      vb = (vb ?? '').toString().toLowerCase();
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (row: InventoryResponse, filter: string) => {
      const f = JSON.parse(filter);
      return [
        this.contains(row.productName, f.productName),
        this.contains(row.productSku, f.sku),
        this.contains(row.quantity?.toString(), f.quantity),
        this.contains(row.lowStockThreshold?.toString(), f.threshold),
        this.contains(row.stockStatus, f.status),
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
      productName: v.productName || '',
      sku:         v.sku         || '',
      quantity:    v.quantity    || '',
      threshold:   v.threshold   || '',
      status:      v.status      || '',
      updatedAt:   v.updatedAt   || '',
    });
  }

  load(): void {
    this.loading = true;
    this.inventoryService.getAll().subscribe({
      next: res => {
        const all = res.data || [];
        this.dataSource.data = all;
        this.lowStockItems   = all.filter(i => i.stockStatus !== 'IN_STOCK');
        this.loading = false;
        this.applyColumnFilters();
        this.applySort();
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      IN_STOCK: 'chip-in-stock', LOW_STOCK: 'chip-low-stock', OUT_OF_STOCK: 'chip-out-of-stock'
    };
    return map[status] || '';
  }

  statusLabel(status: string): string { return status.replace(/_/g, ' '); }

  openUpdateDialog(item: InventoryResponse): void {
    this.dialog.open(InventoryDialogComponent, { data: item, width: '420px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.inventoryService.update(item.productId, result).subscribe({
          next: () => {
            this.snackBar.open('Stock updated!', 'Close', { duration: 3000 });
            this.load();
            this.loadStats();
          },
          error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
        });
      });
  }

  clearFilters(): void { this.filters.reset(); }

  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

}
