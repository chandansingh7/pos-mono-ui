import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormControl, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { OrderService, OrderStats } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CompanyService } from '../../core/services/company.service';
import { OrderResponse } from '../../core/models/order.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { formatCurrency } from '../../core/utils/currency.util';

/** Row model: either an order or a detail placeholder (shown below the expanded order). */
export type OrderTableRow = OrderResponse | { isDetailRow: true; order: OrderResponse };

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit, AfterViewChecked {
  dataSource = new MatTableDataSource<OrderTableRow>([]);
  displayedColumns = ['id', 'customer', 'cashier', 'items', 'total', 'payment', 'status', 'date', 'actions'];
  expandedDetailColumn = 'expandedDetail';
  stats: OrderStats | null = null;

  @ViewChild('detailRow') detailRowRef?: ElementRef<HTMLTableRowElement>;
  private scrollToDetailOnce = false;

  totalElements = 0;
  pageSize = 10;
  loading = false;
  expandedOrder: OrderResponse | null = null;

  /** Orders for current page (from server); detail rows are inserted in buildTableRows(). */
  private allOrders: OrderResponse[] = [];

  filters = new FormGroup({
    id:       new FormControl(''),
    customer: new FormControl(''),
    cashier:  new FormControl(''),
    items:    new FormControl(''),
    total:    new FormControl(''),
    payment:  new FormControl(null),
    status:   new FormControl(null),
    date:     new FormControl(''),
  });

  sortCol = '';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Default: newest orders first (by date)
    this.sortCol = 'date';
    this.sortDir = 'desc';
    this.setupFilterPredicate();

    const initialCustomer = this.route.snapshot.queryParamMap.get('customer');
    if (initialCustomer) {
      this.filters.patchValue({ customer: initialCustomer });
    }

    this.load();
    this.loadStats();
    this.filters.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyColumnFilters());
  }

  ngAfterViewChecked(): void {
    if (this.scrollToDetailOnce && this.detailRowRef?.nativeElement) {
      this.scrollToDetailOnce = false;
      setTimeout(() => this.detailRowRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  }

  loadStats(): void {
    this.orderService.getStats().subscribe({ next: res => { this.stats = res.data ?? null; } });
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
    this.allOrders = [...this.allOrders].sort((a, b) => {
      let va: any, vb: any;
      switch (this.sortCol) {
        case 'customer': va = a.customerName ?? 'Walk-in'; vb = b.customerName ?? 'Walk-in'; break;
        case 'cashier':  va = a.cashierUsername; vb = b.cashierUsername; break;
        case 'items':    va = a.items?.length ?? 0; vb = b.items?.length ?? 0; break;
        case 'payment':  va = a.paymentMethod; vb = b.paymentMethod; break;
        case 'date':     va = a.createdAt; vb = b.createdAt; break;
        default:         va = (a as any)[this.sortCol]; vb = (b as any)[this.sortCol];
      }
      va = (va ?? '').toString().toLowerCase();
      vb = (vb ?? '').toString().toLowerCase();
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    this.dataSource.data = this.buildTableRows();
  }

  private setupFilterPredicate(): void {
    this.dataSource.filterPredicate = (row: OrderTableRow, filter: string) => {
      if (row && (row as any).isDetailRow) return true;
      const o = row as OrderResponse;
      const f = JSON.parse(filter);
      return [
        this.contains(o.id?.toString(), f.id),
        this.contains(o.customerName || 'Walk-in', f.customer),
        this.contains(o.cashierUsername, f.cashier),
        this.contains(o.items?.length?.toString(), f.items),
        this.contains(o.total?.toString(), f.total),
        this.contains(o.paymentMethod, f.payment),
        this.contains(o.status, f.status),
        this.contains(o.createdAt, f.date),
      ].every(Boolean);
    };
  }

  /** Build table rows: orders with optional detail row inserted after expanded order. */
  private buildTableRows(): OrderTableRow[] {
    const rows: OrderTableRow[] = [];
    for (const o of this.allOrders) {
      rows.push(o);
      if (this.expandedOrder?.id === o.id) rows.push({ isDetailRow: true, order: o });
    }
    return rows;
  }

  isOrderRow(row: OrderTableRow): row is OrderResponse {
    return row != null && !(row as any).isDetailRow;
  }

  isDetailRow(row: OrderTableRow): row is { isDetailRow: true; order: OrderResponse } {
    return row != null && !!(row as any).isDetailRow;
  }

  /** For matRowDef when: predicate (index, row) => boolean */
  whenOrderRow = (_index: number, row: OrderTableRow): boolean => this.isOrderRow(row);
  whenDetailRow = (_index: number, row: OrderTableRow): boolean => this.isDetailRow(row);

  private contains(value: string | null | undefined, filter: string): boolean {
    if (!filter) return true;
    return (value ?? '').toString().toLowerCase().includes(filter.toLowerCase());
  }

  private applyColumnFilters(): void {
    const v = this.filters.value;
    this.dataSource.filter = JSON.stringify({
      id:       v.id       || '',
      customer: v.customer || '',
      cashier:  v.cashier  || '',
      items:    v.items    || '',
      total:    v.total    || '',
      payment:  v.payment  || '',
      status:   v.status   || '',
      date:     v.date     || '',
    });
  }

  load(page = 0): void {
    this.loading = true;
    this.orderService.getAll(page, this.pageSize).subscribe({
      next: res => {
        this.allOrders = res.data?.content || [];
        this.totalElements = res.data?.totalElements || 0;
        this.expandedOrder = null;
        this.loading = false;
        this.dataSource.data = this.buildTableRows();
        this.applyColumnFilters();
        this.applySort();
      },
      error: () => { this.loading = false; }
    });
  }

  onPage(e: PageEvent): void { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  onOrderRowClick(row: OrderTableRow): void {
    if (this.isOrderRow(row)) this.toggleExpand(row);
  }

  toggleExpand(order: OrderResponse): void {
    const opening = this.expandedOrder?.id !== order.id;
    this.expandedOrder = this.expandedOrder?.id === order.id ? null : order;
    this.dataSource.data = this.buildTableRows();
    if (opening && this.expandedOrder) this.scrollToDetailOnce = true;
  }

  cancelOrder(order: OrderResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Cancel Order', message: `Cancel Order #${order.id}?`, confirmText: 'Cancel Order' }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.orderService.cancel(order.id).subscribe({
        next: () => { this.snackBar.open('Order cancelled', 'Close', { duration: 3000 }); this.load(); this.loadStats(); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    });
  }

  refundOrder(order: OrderResponse): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Refund Order', message: `Issue refund for Order #${order.id}?`, confirmText: 'Refund' }
    }).afterClosed().subscribe(() => {
      this.snackBar.open('Refund issued — feature coming soon', 'Close', { duration: 3000 });
    });
  }

  printReceipt(order: OrderResponse): void {
    const c = this.companyService.getCached();
    const widthClass = (c?.receiptPaperSize === '58mm') ? 'receipt-58' : (c?.receiptPaperSize === 'A4') ? 'receipt-a4' : 'receipt-80';
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      this.snackBar.open('Allow popups to print receipt', 'Close', { duration: 3000 });
      return;
    }
    w.document.write(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt #${order.id}</title>
<style>
  body { font-family: monospace; margin: 0; padding: 12px; }
  .receipt-58 { max-width: 58mm; }
  .receipt-80 { max-width: 80mm; }
  .receipt-a4 { max-width: 210mm; }
  .company-name { font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 8px; }
  .company-detail { font-size: 0.85em; text-align: center; color: #444; margin: 2px 0; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
  .footer { text-align: center; margin-top: 12px; font-size: 0.9em; }
</style></head><body class="${widthClass}">
  <div class="company-name">${c?.name || 'Receipt'}</div>
  ${c?.address ? `<div class="company-detail">${c.address}</div>` : ''}
  ${c?.phone ? `<div class="company-detail">${c.phone}</div>` : ''}
  ${c?.receiptHeaderText ? `<div class="company-detail">${c.receiptHeaderText}</div>` : ''}
  <div style="margin: 8px 0; border-bottom: 1px dashed #000;"></div>
  <div>Order #${order.id}</div>
  ${(order.items || []).map((i: { productName: string; quantity: number; subtotal: number }) =>
    `<div class="row"><span>${i.productName} x${i.quantity}</span><span>${formatCurrency(Number(i.subtotal), c?.displayCurrency || 'USD', c?.locale)}</span></div>`
  ).join('')}
  <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(order.subtotal), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Tax</span><span>${formatCurrency(Number(order.tax), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  ${(order.discount || 0) > 0 ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(order.discount), c?.displayCurrency || 'USD', c?.locale)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatCurrency(Number(order.total), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Payment</span><span>${order.paymentMethod || ''}</span></div>
  ${c?.receiptFooterText ? `<div class="footer">${c.receiptFooterText}</div>` : ''}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  }

  emailReceipt(order: OrderResponse): void {
    const c = this.companyService.getCached();
    const to = order.customerEmail || '';
    const subject = `Receipt #${order.id} - ${c?.name || 'Your purchase'}`;
    const lines: string[] = [];
    lines.push(`${c?.name || 'Receipt'} - Order #${order.id}`);
    lines.push('');
    (order.items || []).forEach(i => {
      lines.push(`${i.productName} x${i.quantity} - ${formatCurrency(Number(i.subtotal), c?.displayCurrency || 'USD', c?.locale)}`);
    });
    lines.push('');
    lines.push(`Subtotal: ${formatCurrency(Number(order.subtotal), c?.displayCurrency || 'USD', c?.locale)}`);
    lines.push(`Tax: ${formatCurrency(Number(order.tax), c?.displayCurrency || 'USD', c?.locale)}`);
    if ((order.discount || 0) > 0) {
      lines.push(`Discount: -${formatCurrency(Number(order.discount), c?.displayCurrency || 'USD', c?.locale)}`);
    }
    lines.push(`TOTAL: ${formatCurrency(Number(order.total), c?.displayCurrency || 'USD', c?.locale)}`);
    lines.push(`Payment: ${order.paymentMethod || ''}`);
    if (c?.receiptFooterText) {
      lines.push('');
      lines.push(c.receiptFooterText);
    }
    const body = lines.join('\n');
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  clearFilters(): void { this.filters.reset(); }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'chip-completed', PENDING: 'chip-pending',
      CANCELLED: 'chip-cancelled', REFUNDED: 'chip-cancelled'
    };
    return map[status] || '';
  }

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isAdminOrManager(): boolean { return this.authService.isAdminOrManager(); }
  get hasActiveFilters(): boolean { return Object.values(this.filters.value).some(v => !!v); }

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }
}
