import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import { LabelService } from '../../core/services/label.service';
import { CategoryService } from '../../core/services/category.service';
import { CompanyService } from '../../core/services/company.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { ProductResponse } from '../../core/models/product.models';
import { LabelRequest, LabelResponse } from '../../core/models/label.models';
import { CategoryResponse } from '../../core/models/category.models';
import { ApiResponse, PageResponse } from '../../core/models/api.models';
import { LabelDialogComponent } from './label-dialog.component';
import { LabelAttachProductDialogComponent } from './label-attach-product-dialog.component';
import { LabelBulkDialogComponent } from './label-bulk-dialog.component';
import { AddAsProductDialogComponent } from './add-as-product-dialog.component';
import { PrintLabelsBulkDialogComponent, PrintableItemWithCount } from './print-labels-bulk-dialog.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

const LABELS_PER_PAGE = 8;
const JSBARCODE_CDN = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';

interface PrintableLabel {
  name: string;
  price: number;
  sku?: string | null;
  barcode?: string;
  id?: number;
}

@Component({
  selector: 'app-labels',
  templateUrl: './labels.component.html',
  styleUrls: ['./labels.component.scss']
})
export class LabelsComponent implements OnInit {
  activeTab = 0;

  // ── From Products tab ────────────────────────────────────────────────────────
  products: ProductResponse[] = [];
  selectedIds = new Set<number>();
  selectedProductsMap = new Map<number, ProductResponse>();

  // ── Standalone Labels tab ───────────────────────────────────────────────────
  labels: LabelResponse[] = [];
  selectedLabelIds = new Set<number>();
  selectedLabelsMap = new Map<number, LabelResponse>();

  categories: CategoryResponse[] = [];
  loading = false;
  totalElements = 0;
  pageSize = 50;
  currentPage = 0;

  searchControl = new FormControl('');
  categoryFilter = new FormControl<number | null>(null);

  displayedColumns = ['select', 'name', 'sku', 'barcode', 'category', 'price'];
  labelDisplayedColumns = ['select', 'name', 'sku', 'barcode', 'category', 'price', 'actions'];

  constructor(
    private productService: ProductService,
    private labelService: LabelService,
    private categoryService: CategoryService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts(0);
    this.loadLabels(0);
    this.searchControl.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => {
        if (this.activeTab === 0) this.loadProducts(0);
        else this.loadLabels(0);
      });
    this.categoryFilter.valueChanges.subscribe(() => {
      if (this.activeTab === 0) this.loadProducts(0);
      else this.loadLabels(0);
    });
  }

  onTabChange(idx: number): void {
    this.activeTab = idx;
    this.cdr.detectChanges();
  }

  // ── Products tab ────────────────────────────────────────────────────────────
  loadProducts(page = 0): void {
    this.loading = true;
    this.productService
      .getAll(
        this.searchControl.value || '',
        this.categoryFilter.value ?? undefined,
        page,
        this.pageSize,
        'name,asc'
      )
      .subscribe({
        next: (res: ApiResponse<PageResponse<ProductResponse>>) => {
          this.products = res.data?.content ?? [];
          this.totalElements = res.data?.totalElements ?? 0;
          this.currentPage = page;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  toggleSelectProduct(p: ProductResponse): void {
    if (this.selectedIds.has(p.id)) {
      this.selectedIds.delete(p.id);
      this.selectedProductsMap.delete(p.id);
    } else {
      this.selectedIds.add(p.id);
      this.selectedProductsMap.set(p.id, p);
    }
    this.selectedIds = new Set(this.selectedIds);
    this.cdr.detectChanges();
  }

  toggleSelectAllProducts(): void {
    if (this.products.every(p => this.selectedIds.has(p.id))) {
      this.products.forEach(p => {
        this.selectedIds.delete(p.id);
        this.selectedProductsMap.delete(p.id);
      });
    } else {
      this.products.forEach(p => {
        this.selectedIds.add(p.id);
        this.selectedProductsMap.set(p.id, p);
      });
    }
    this.selectedIds = new Set(this.selectedIds);
    this.cdr.detectChanges();
  }

  selectAllInCategory(categoryId: number): void {
    const inCategory = this.products.filter(p => p.categoryId === categoryId);
    const allSelected = inCategory.every(p => this.selectedIds.has(p.id));
    if (allSelected) {
      inCategory.forEach(p => {
        this.selectedIds.delete(p.id);
        this.selectedProductsMap.delete(p.id);
      });
    } else {
      inCategory.forEach(p => {
        this.selectedIds.add(p.id);
        this.selectedProductsMap.set(p.id, p);
      });
    }
    this.selectedIds = new Set(this.selectedIds);
    this.cdr.detectChanges();
  }

  get isAllProductsSelected(): boolean {
    return this.products.length > 0 && this.products.every(p => this.selectedIds.has(p.id));
  }

  // ── Standalone Labels tab ────────────────────────────────────────────────────
  loadLabels(page = 0): void {
    this.loading = true;
    this.labelService
      .getAll(
        this.searchControl.value || '',
        this.categoryFilter.value ?? undefined,
        page,
        this.pageSize
      )
      .subscribe({
        next: (res: ApiResponse<PageResponse<LabelResponse>>) => {
          this.labels = res.data?.content ?? [];
          this.totalElements = res.data?.totalElements ?? 0;
          this.currentPage = page;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  toggleSelectLabel(l: LabelResponse): void {
    if (this.selectedLabelIds.has(l.id)) {
      this.selectedLabelIds.delete(l.id);
      this.selectedLabelsMap.delete(l.id);
    } else {
      this.selectedLabelIds.add(l.id);
      this.selectedLabelsMap.set(l.id, l);
    }
    this.selectedLabelIds = new Set(this.selectedLabelIds);
    this.cdr.detectChanges();
  }

  toggleSelectAllLabels(): void {
    if (this.labels.every(l => this.selectedLabelIds.has(l.id))) {
      this.labels.forEach(l => {
        this.selectedLabelIds.delete(l.id);
        this.selectedLabelsMap.delete(l.id);
      });
    } else {
      this.labels.forEach(l => {
        this.selectedLabelIds.add(l.id);
        this.selectedLabelsMap.set(l.id, l);
      });
    }
    this.selectedLabelIds = new Set(this.selectedLabelIds);
    this.cdr.detectChanges();
  }

  get isAllLabelsSelected(): boolean {
    return this.labels.length > 0 && this.labels.every(l => this.selectedLabelIds.has(l.id));
  }

  openCreateLabelDialog(): void {
    this.dialog
      .open(LabelDialogComponent, {
        data: { categories: this.categories },
        width: '440px',
        disableClose: true
      })
      .afterClosed()
      .subscribe((req) => {
        if (!req) return;
        this.labelService.create(req).subscribe({
          next: () => {
            this.snackBar.open('Label created', 'Close', { duration: 3000 });
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error creating label', 'Close', { duration: 4000 })
        });
      });
  }

  openBulkCreateDialog(): void {
    this.dialog
      .open(LabelBulkDialogComponent, {
        data: { categories: this.categories },
        width: '780px',
        maxHeight: '90vh',
        disableClose: true
      })
      .afterClosed()
      .subscribe((requests: LabelRequest[] | null) => {
        if (!requests || requests.length === 0) return;
        this.labelService.createBulk(requests).subscribe({
          next: (res) => {
            const count = res.data?.length ?? 0;
            this.snackBar.open(`${count} label(s) created`, 'Close', { duration: 3000 });
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error creating labels', 'Close', { duration: 4000 })
        });
      });
  }

  openEditLabelDialog(label: LabelResponse): void {
    this.dialog
      .open(LabelDialogComponent, {
        data: { label, categories: this.categories },
        width: '440px',
        disableClose: true
      })
      .afterClosed()
      .subscribe((req) => {
        if (!req) return;
        this.labelService.update(label.id, req).subscribe({
          next: () => {
            this.snackBar.open('Label updated', 'Close', { duration: 3000 });
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error updating label', 'Close', { duration: 4000 })
        });
      });
  }

  attachToExistingProduct(label: LabelResponse): void {
    this.dialog
      .open(LabelAttachProductDialogComponent, {
        data: { label },
        width: '560px',
        disableClose: true,
      })
      .afterClosed()
      .subscribe((result: { productId: number; force: boolean } | null) => {
        if (!result) return;
        this.labelService.attachToProduct(label.id, result.productId, result.force).subscribe({
          next: () => {
            this.snackBar.open('Label attached to product', 'Close', { duration: 3000 });
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error attaching label', 'Close', { duration: 4000 }),
        });
      });
  }

  addAsProduct(label: LabelResponse): void {
    this.dialog
      .open(AddAsProductDialogComponent, { data: { label }, width: '360px', disableClose: true })
      .afterClosed()
      .subscribe((initialStock: number | null) => {
        if (initialStock === null) return;
        this.labelService.addAsProduct(label.id, initialStock).subscribe({
          next: () => {
            this.snackBar.open('Product created from label', 'Close', { duration: 3000 });
            this.selectedLabelIds.delete(label.id);
            this.selectedLabelsMap.delete(label.id);
            this.selectedLabelIds = new Set(this.selectedLabelIds);
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error adding as product', 'Close', { duration: 4000 })
        });
      });
  }

  deleteLabel(label: LabelResponse): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Delete Label', message: `Delete label "${label.name}"?`, confirmText: 'Delete' }
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.labelService.delete(label.id).subscribe({
          next: () => {
            this.snackBar.open('Label deleted', 'Close', { duration: 3000 });
            this.loadLabels(0);
          },
          error: (err) =>
            this.snackBar.open(err.error?.message || 'Error deleting label', 'Close', { duration: 4000 })
        });
      });
  }

  // ── Shared ───────────────────────────────────────────────────────────────────
  loadCategories(): void {
    this.categoryService.getList().subscribe({
      next: (res) => {
        this.categories = res.data ?? [];
      }
    });
  }

  onPage(e: { pageIndex: number; pageSize: number }): void {
    this.pageSize = e.pageSize;
    if (this.activeTab === 0) this.loadProducts(e.pageIndex);
    else this.loadLabels(e.pageIndex);
  }

  get selectedCount(): number {
    return this.activeTab === 0 ? this.selectedIds.size : this.selectedLabelIds.size;
  }

  /** Open bulk print dialog for selected products (From Products tab). */
  openPrintLabelsBulkDialog(products?: ProductResponse[]): void {
    const toUse = products ?? Array.from(this.selectedProductsMap.values());
    if (toUse.length === 0) {
      this.snackBar.open('Select at least one product', 'Close', { duration: 3000 });
      return;
    }
    this.dialog
      .open(PrintLabelsBulkDialogComponent, {
        data: { products: toUse },
        width: '520px',
        maxHeight: '90vh',
        disableClose: false
      })
      .afterClosed()
      .subscribe((result: PrintableItemWithCount[] | null) => {
        if (!result || result.length === 0) return;
        const items: PrintableLabel[] = [];
        result.forEach(({ product, count }) => {
          const pl: PrintableLabel = {
            name: product.name,
            price: product.price,
            sku: product.sku,
            barcode: product.barcode,
            id: product.id
          };
          for (let i = 0; i < count; i++) items.push(pl);
        });
        this.doPrintLabels(items);
      });
  }

  openPrintPreview(): void {
    const items: PrintableLabel[] =
      this.activeTab === 0
        ? Array.from(this.selectedProductsMap.values())
        : Array.from(this.selectedLabelsMap.values());

    if (items.length === 0) {
      this.snackBar.open(
        this.activeTab === 0 ? 'Select at least one product' : 'Select at least one label',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    if (this.activeTab === 0) {
      this.openPrintLabelsBulkDialog(Array.from(this.selectedProductsMap.values()));
      return;
    }

    this.doPrintLabels(items);
  }

  private doPrintLabels(items: PrintableLabel[]): void {
    const html = this.buildPrintHtml(items);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.snackBar.open('Popup blocked. Allow popups to print labels.', 'Close', { duration: 4000 });
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    const script = printWindow.document.createElement('script');
    script.src = JSBARCODE_CDN;
    script.onload = () => {
      try {
        items.forEach((item, i) => {
          const el = printWindow.document.getElementById(`barcode-${i}`);
          const code = item.barcode?.trim() || item.sku?.trim() || String(item.id ?? '');
          if (el && code) {
            (printWindow as any).JsBarcode(el, code, {
              format: 'CODE128',
              width: 1.2,
              height: 36,
              displayValue: false
            });
          }
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    };
    script.onerror = () => {
      this.snackBar.open('Failed to load barcode library', 'Close', { duration: 3000 });
      printWindow.close();
    };
    printWindow.document.body.appendChild(script);
  }

  private buildPrintHtml(items: PrintableLabel[]): string {
    const pages: PrintableLabel[][] = [];
    for (let i = 0; i < items.length; i += LABELS_PER_PAGE) {
      pages.push(items.slice(i, i + LABELS_PER_PAGE));
    }
    const c = this.companyService.getCached();
    const curr = c?.displayCurrency || 'USD';
    const loc = c?.locale;

    const labelHtml = (item: PrintableLabel, idx: number) => `
      <div class="label">
        <svg id="barcode-${idx}" class="label-barcode"></svg>
        <div class="label-name">${this.escapeHtml(item.name)}</div>
        <div class="label-price">${formatCurrency(Number(item.price), curr, loc)}</div>
        <div class="label-sku">${this.escapeHtml(item.sku || '—')}</div>
      </div>
    `;

    const pageHtml = (pageItems: PrintableLabel[], pageStartIdx: number) => `
      <div class="label-page">
        ${pageItems.map((item, i) => labelHtml(item, pageStartIdx + i)).join('')}
      </div>
    `;

    const pagesContent = pages
      .map((page, i) => pageHtml(page, i * LABELS_PER_PAGE))
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Product Labels</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; padding: 12mm; }
    .label-page {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(4, 1fr);
      gap: 6mm;
      width: 210mm;
      min-height: 297mm;
      padding: 8mm;
      page-break-after: always;
    }
    .label-page:last-child { page-break-after: auto; }
    .label {
      border: 1px dashed #e0e0e0;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .label-barcode { width: 100%; max-height: 32px; }
    .label-name { font-weight: 600; margin-top: 2mm; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .label-price { font-size: 14px; font-weight: 700; color: #1a237e; margin-top: 1mm; }
    .label-sku { font-size: 10px; color: #757575; margin-top: 1mm; }
    @media print {
      body { padding: 0; }
      .label-page { box-shadow: none; }
      .label { border-color: #ccc; }
    }
  </style>
</head>
<body>
  ${pagesContent}
</body>
</html>
    `;
  }

  private escapeHtml(text: string): string {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
  }
}
