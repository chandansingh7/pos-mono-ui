import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService, ProductStats, BulkUploadResult } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { TaxRuleService } from '../../core/services/tax-rule.service';
import { ProductResponse } from '../../core/models/product.models';
import { CategoryResponse } from '../../core/models/category.models';
import { TaxRuleResponse } from '../../core/models/tax-rule.models';
import { ProductDialogComponent } from './product-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { BulkUploadPreviewModalComponent, BulkUploadPreviewData } from './bulk-upload-preview-modal.component';
import { parseBulkFile } from './bulk-upload-parser.util';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  dataSource = new MatTableDataSource<ProductResponse>();
  categories: CategoryResponse[] = [];
  taxRules: TaxRuleResponse[] = [];
  brokenImages = new Set<number>();
  stats: ProductStats | null = null;

  displayedColumns = ['image', 'name', 'sku', 'category', 'price', 'stock', 'status', 'updatedAt', 'actions'];

  totalElements = 0;
  pageSize = 10;
  loading = false;
  bulkUploading = false;
  bulkPreviewLoading = false;

  searchControl  = new FormControl('');
  categoryFilter = new FormControl(null);

  filters = new FormGroup({
    name:      new FormControl(''),
    sku:       new FormControl(''),
    category:  new FormControl(''),
    price:     new FormControl(''),
    stock:     new FormControl(''),
    status:    new FormControl('active'),
    updatedAt: new FormControl(''),
  });

  // ── Custom sort ──────────────────────────────────────────────────────────────
  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private companyService: CompanyService,
    private authService: AuthService,
    private taxRuleService: TaxRuleService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  ngOnInit(): void {
    // Default: show most recently updated products first
    this.sortCol = 'updatedAt';
    this.sortDir = 'desc';
    this.loadCategories();
    this.loadTaxRules();
    this.loadProducts();
    this.loadStats();
    // All filters drive server-side search across entire dataset
    this.filters.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.loadProducts(0));
    this.searchControl.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => this.loadProducts(0));
    this.categoryFilter.valueChanges.subscribe(() => this.loadProducts(0));
  }

  loadStats(): void {
    this.productService.getStats().subscribe({
      next: res => {
        this.stats = res.data ?? null;
        this.cdr.detectChanges();
      }
    });
  }

  downloadTemplate(): void {
    this.productService.downloadBulkTemplate().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products-bulk-template.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('Template downloaded', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Download failed', 'Close', { duration: 3000 })
    });
  }

  downloadTemplateCsv(): void {
    this.productService.downloadBulkTemplateCsv().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'products-bulk-template.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.snackBar.open('CSV template downloaded', 'Close', { duration: 2000 });
      },
      error: () => this.snackBar.open('Download failed', 'Close', { duration: 3000 })
    });
  }

  onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      this.snackBar.open('Please select a CSV or Excel file', 'Close', { duration: 3000 });
      return;
    }
    console.log('[BulkUpload] File selected:', { fileName: file.name, sizeBytes: file.size, type: file.type });
    this.bulkPreviewLoading = true;
    parseBulkFile(file).then(rows => {
      this.bulkPreviewLoading = false;
      console.log('[BulkUpload] Parsed preview:', { rowCount: rows.length, sample: rows.slice(0, 2).map(r => ({ rowIndex: r.rowIndex, name: r.name, sku: r.sku, initialStock: r.initialStock })) });
      const data: BulkUploadPreviewData = { file, rows, fileName: file.name };
      this.dialog.open(BulkUploadPreviewModalComponent, {
        width: '960px',
        maxHeight: '90vh',
        data,
        disableClose: false
      }).afterClosed().subscribe(uploaded => {
        if (uploaded) {
          this.loadProducts(0);
          this.loadStats();
        }
      });
    }).catch(() => {
      this.bulkPreviewLoading = false;
      this.snackBar.open('Could not read file. Use CSV or Excel format.', 'Close', { duration: 4000 });
    });
  }

  sortBy(col: string): void {
    this.sortDir = this.sortCol === col && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortCol = col;
    this.loadProducts(0);
  }

  sortIcon(col: string): string {
    if (this.sortCol !== col) return 'swap_vert';
    return this.sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  private applySort(): void {
    if (!this.sortCol) return;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    this.dataSource.data = [...this.dataSource.data].sort((a, b) => {
      const va = this.sortValue(a);
      const vb = this.sortValue(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
  }

  private sortValue(item: ProductResponse): any {
    switch (this.sortCol) {
      case 'category':  return (item.categoryName ?? '').toLowerCase();
      case 'stock':     return item.quantity ?? 0;
      case 'status':    return item.active ? 1 : 0;
      case 'price':     return item.price ?? 0;
      case 'updatedAt': return item.updatedAt ?? '';
      default:          return ((item as any)[this.sortCol] ?? '').toString().toLowerCase();
    }
  }

  loadProducts(page = 0): void {
    this.loading = true;
    const sort = this.sortCol ? `${this.sortCol},${this.sortDir}` : undefined;
    const v = this.filters.value;
    const nameSearch = (v.name || '').toString().trim();
    const skuSearch = (v.sku || '').toString().trim();
    const search = nameSearch || skuSearch || this.searchControl.value || '';
    const filters = {
      status: v.status || '',
      price: v.price || '',
      stock: v.stock || '',
      updatedAt: v.updatedAt || '',
    };
    this.productService.getAll(
      search || undefined,
      this.categoryFilter.value || undefined,
      page, this.pageSize, sort, filters
    ).subscribe({
      next: res => {
        this.brokenImages.clear();
        this.dataSource.data = res.data?.content || [];
        this.totalElements   = res.data?.totalElements || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  loadCategories(): void {
    this.categoryService.getList().subscribe({ next: res => { this.categories = res.data || []; } });
  }

  loadTaxRules(): void {
    this.taxRuleService.getAll().subscribe({ next: res => { this.taxRules = res.data || []; } });
  }

  onPage(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.loadProducts(e.pageIndex);
  }

  openDialog(product?: ProductResponse): void {
    const ref = this.dialog.open(ProductDialogComponent, {
      data: { product, categories: this.categories, taxRules: this.taxRules }, width: '620px', disableClose: true
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const { imageFile, ...productData } = result;
      const save$ = product
        ? this.productService.update(product.id, productData)
        : this.productService.create(productData);
      save$.subscribe({
        next: (res) => {
          const savedId = res.data?.id ?? product?.id;
          if (imageFile && savedId) {
            this.productService.uploadImage(savedId, imageFile).subscribe({
              next: () => { this.snackBar.open('Product saved with image!', 'Close', { duration: 3000 }); this.loadProducts(0); this.loadStats(); },
              error: () => { this.snackBar.open('Product saved — image upload failed', 'Close', { duration: 4000 }); this.loadProducts(0); this.loadStats(); }
            });
          } else {
            this.snackBar.open('Product saved!', 'Close', { duration: 3000 });
            this.loadProducts(0);
            this.loadStats();
          }
        },
        error: err => this.snackBar.open(err.error?.message || 'Error saving product', 'Close', { duration: 4000 })
      });
    });
  }

  toggleActive(product: ProductResponse): void {
    const action = product.active ? 'Deactivate' : 'Activate';
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: `${action} Product`, message: `${action} "${product.name}"?`, confirmText: action }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      const req = { ...product, active: !product.active, categoryId: product.categoryId,
        initialStock: product.quantity, lowStockThreshold: 10 };
      this.productService.update(product.id, req).subscribe({
        next: () => {
          this.snackBar.open(`Product ${action.toLowerCase()}d`, 'Close', { duration: 3000 });
          this.loadProducts(0);
          this.loadStats();
        },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  delete(product: ProductResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Product', message: `Delete "${product.name}"?`, confirmText: 'Delete' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.productService.delete(product.id).subscribe({
        next: () => {
          this.snackBar.open('Product deleted', 'Close', { duration: 3000 });
          this.loadProducts(0);
          this.loadStats();
        },
        error: err => this.snackBar.open(err.error?.message || 'Error deleting product', 'Close', { duration: 4000 })
      });
    });
  }

  onImageError(productId: number): void { this.brokenImages.add(productId); }
  hasImage(p: ProductResponse): boolean { return !!p.imageUrl && !this.brokenImages.has(p.id); }

  clearFilters(): void {
    this.filters.reset();
    this.searchControl.reset();
    this.categoryFilter.reset();
  }

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get canUseBulkUpload(): boolean { return !!this.authService.getUsername(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

}
