import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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

  totalElements = 0;
  pageSize = 20;
  loading = false;
  stats: InventoryStats | null = null;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('productNameInput') productNameInput?: ElementRef<HTMLInputElement>;

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
    this.load(0);
    this.loadStats();
    this.loadLowStock();
    // Product and SKU filters drive server-side search across all data
    this.filters.get('productName')?.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load(0));
    this.filters.get('sku')?.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.load(0));
    this.filters.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyColumnFilters());
  }

  refresh(): void {
    this.load(0);
    this.loadStats();
    this.loadLowStock();
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
    this.load(0);
  }

  sortIcon(col: string): string {
    if (this.sortCol !== col) return 'swap_vert';
    return this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
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

  /** Map frontend column names to backend entity sort properties. */
  private getSortParam(): string {
    const prop: Record<string, string> = {
      productName: 'product.name', sku: 'product.sku', quantity: 'quantity',
      threshold: 'lowStockThreshold', status: 'quantity', updatedAt: 'updatedAt'
    };
    const sortProp = prop[this.sortCol] || 'updatedAt';
    return `${sortProp},${this.sortDir}`;
  }

  load(page = 0): void {
    this.loading = true;
    const sort = this.getSortParam();
    const productName = (this.filters.value.productName || '').toString().trim();
    const sku = (this.filters.value.sku || '').toString().trim();
    const search = productName || sku || undefined;
    this.inventoryService.getAll(search, page, this.pageSize, sort).subscribe({
      next: res => {
        this.dataSource.data = res.data?.content || [];
        this.totalElements = res.data?.totalElements ?? 0;
        this.loading = false;
        this.applyColumnFilters();
        this.cdr.detectChanges();
        // Focus Product search input once table is visible so user can type without clicking
        if (page === 0) {
          setTimeout(() => this.productNameInput?.nativeElement?.focus(), 150);
        }
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  loadLowStock(): void {
    this.inventoryService.getLowStock().subscribe({
      next: res => { this.lowStockItems = res.data || []; this.cdr.detectChanges(); }
    });
  }

  onPage(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.load(e.pageIndex);
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
            this.load(0);
            this.loadStats();
            this.loadLowStock();
          },
          error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
        });
      });
  }

  clearFilters(): void { this.filters.reset(); }

  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

}
