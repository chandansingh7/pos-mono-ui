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
import { NetworkStatusService } from '../../core/services/network-status.service';
import { PosLocalStoreService, LocalOrder } from '../../core/services/pos-local-store.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { OfflineSettingsService } from '../../core/services/offline-settings.service';
import { OrderResponse } from '../../core/models/order.models';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { formatCurrency } from '../../core/utils/currency.util';

/** An offline order wrapped to match the OrderResponse shape for the table. */
export interface OfflineOrderRow {
  id: number;
  customerName?: string;
  cashierUsername: string;
  items: Array<{ productName: string; quantity: number; subtotal: number }>;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  /** Differentiates offline-only rows in the unified list. */
  isOfflineRow: true;
  offlineSyncStatus: 'pending' | 'synced' | 'failed';
  offlineLocalId: string;
  offlineError?: string;
}

/** Row model: either an order or a detail placeholder (shown below the expanded order). */
export type OrderTableRow = OrderResponse | OfflineOrderRow | { isDetailRow: true; order: OrderResponse | OfflineOrderRow };

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
  expandedOrder: OrderResponse | OfflineOrderRow | null = null;

  /** Orders for current page (from server); detail rows are inserted in buildTableRows(). */
  private allOrders: OrderResponse[] = [];
  /** Offline orders from IndexedDB merged into the list. */
  private offlineOrders: OfflineOrderRow[] = [];

  /** Pending offline orders count (from IndexedDB). */
  pendingOfflineCount = 0;
  /** Failed offline orders count (sync rejected). */
  failedOfflineCount = 0;
  isOffline = false;
  ordersBlockedOffline = false;

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
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService,
    private offlineSync: OfflineSyncService,
    private offlineSettings: OfflineSettingsService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Default: newest orders first (by date)
    this.sortCol = 'date';
    this.sortDir = 'desc';

    const initialCustomer = this.route.snapshot.queryParamMap.get('customer');
    if (initialCustomer) {
      this.filters.patchValue({ customer: initialCustomer });
    }

    this.load();
    this.loadStats();
    this.refreshPendingOfflineCount();
    this.networkStatus.isOffline$.subscribe(off => {
      this.isOffline = off;
      this.ordersBlockedOffline = off && !this.offlineSettings.getSettings().allowOrders;
      this.refreshPendingOfflineCount();
    });
    this.filters.valueChanges.pipe(debounceTime(350)).subscribe(() => this.load(0));
  }

  private refreshPendingOfflineCount(): void {
    this.localStore.init().then(async () => {
      this.pendingOfflineCount = await this.localStore.getPendingCount();
      this.failedOfflineCount = await this.localStore.getFailedCount();
      await this.loadOfflineOrders();
    });
  }

  /** Load all local offline orders and merge them into the table. */
  private async loadOfflineOrders(): Promise<void> {
    await this.localStore.init();
    const local = await this.localStore.getAllLocalOrders();
    this.offlineOrders = local
      .filter(o => o.syncStatus === 'pending' || o.syncStatus === 'failed')
      .map(o => this.localOrderToRow(o));
    this.dataSource.data = this.buildTableRows();
  }

  private localOrderToRow(o: LocalOrder): OfflineOrderRow {
    return {
      id: o.serverOrderId ?? 0,
      customerName: o.customerName,
      cashierUsername: 'you (offline)',
      items: (o.items || []).map(i => ({
        productName: i.productName ?? `Product #${i.productId}`,
        quantity: i.quantity,
        subtotal: i.subtotal ?? 0
      })),
      total: o.total,
      subtotal: o.subtotal,
      tax: o.tax,
      discount: o.discount,
      paymentMethod: o.paymentMethod as string,
      status: o.syncStatus === 'failed' ? 'OFFLINE_FAILED' : 'OFFLINE_PENDING',
      createdAt: o.createdAt,
      isOfflineRow: true,
      offlineSyncStatus: o.syncStatus,
      offlineLocalId: o.localId,
      offlineError: o.lastSyncError
    };
  }

  async retryFailedSync(): Promise<void> {
    await this.localStore.init();
    const count = await this.localStore.resetAllFailedToPending();
    this.refreshPendingOfflineCount();
    this.offlineSync.triggerSync();
    this.snackBar.open(count > 0 ? `${count} failed order(s) queued for retry.` : 'No failed orders to retry.', 'Close', { duration: 3000 });
  }

  triggerOfflineSync(): void {
    this.offlineSync.triggerSync();
    setTimeout(() => this.refreshPendingOfflineCount(), 2000);
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
    const sortFn = (a: any, b: any) => {
      let va: any, vb: any;
      switch (this.sortCol) {
        case 'customer': va = a.customerName ?? 'Walk-in'; vb = b.customerName ?? 'Walk-in'; break;
        case 'cashier':  va = a.cashierUsername; vb = b.cashierUsername; break;
        case 'items':    va = a.items?.length ?? 0; vb = b.items?.length ?? 0; break;
        case 'payment':  va = a.paymentMethod; vb = b.paymentMethod; break;
        case 'date':     va = a.createdAt; vb = b.createdAt; break;
        default:         va = a[this.sortCol]; vb = b[this.sortCol];
      }
      va = (va ?? '').toString().toLowerCase();
      vb = (vb ?? '').toString().toLowerCase();
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    };
    this.allOrders = [...this.allOrders].sort(sortFn);
    this.dataSource.data = this.buildTableRows();
  }

  /** Build table rows: server orders + offline orders (at top), with detail row after expanded. */
  private buildTableRows(): OrderTableRow[] {
    const rows: OrderTableRow[] = [];
    // Offline rows first (most recent activity visible immediately)
    for (const o of this.offlineOrders) {
      rows.push(o);
      if (this.expandedOrder && 'offlineLocalId' in this.expandedOrder && this.expandedOrder.offlineLocalId === o.offlineLocalId) {
        rows.push({ isDetailRow: true, order: o });
      }
    }
    for (const o of this.allOrders) {
      rows.push(o);
      if (this.expandedOrder && !('offlineLocalId' in this.expandedOrder) && this.expandedOrder.id === o.id) {
        rows.push({ isDetailRow: true, order: o });
      }
    }
    return rows;
  }

  isOrderRow(row: OrderTableRow): row is OrderResponse | OfflineOrderRow {
    return row != null && !(row as any).isDetailRow;
  }

  isDetailRow(row: OrderTableRow): row is { isDetailRow: true; order: OrderResponse | OfflineOrderRow } {
    return row != null && !!(row as any).isDetailRow;
  }

  isOfflineOrderRow(row: OrderTableRow): row is OfflineOrderRow {
    return row != null && !!(row as any).isOfflineRow;
  }

  /** For matRowDef when: predicate (index, row) => boolean */
  whenOrderRow = (_index: number, row: OrderTableRow): boolean => this.isOrderRow(row);
  whenDetailRow = (_index: number, row: OrderTableRow): boolean => this.isDetailRow(row);

  load(page = 0): void {
    this.loading = true;
    const v = this.filters.value;
    const filters = {
      id: v.id || '',
      customer: v.customer || '',
      cashier: v.cashier || '',
      items: v.items || '',
      total: v.total || '',
      status: v.status || '',
      payment: v.payment || '',
      date: v.date || '',
    };
    this.orderService.getAll(page, this.pageSize, filters).subscribe({
      next: res => {
        this.allOrders = res.data?.content || [];
        this.totalElements = res.data?.totalElements || 0;
        this.expandedOrder = null;
        this.loading = false;
        this.applySort();
        // Merge offline orders into the table
        this.localStore.init().then(async () => {
          await this.loadOfflineOrders();
        });
      },
      error: () => { this.loading = false; }
    });
  }

  onPage(e: PageEvent): void { this.pageSize = e.pageSize; this.load(e.pageIndex); }

  onOrderRowClick(row: OrderTableRow): void {
    if (this.isOrderRow(row)) this.toggleExpand(row);
  }

  toggleExpand(order: OrderResponse | OfflineOrderRow): void {
    const isOffline = 'offlineLocalId' in order;
    const currentIsOffline = this.expandedOrder && 'offlineLocalId' in this.expandedOrder;
    const isSame = isOffline && currentIsOffline
      ? (this.expandedOrder as OfflineOrderRow).offlineLocalId === order.offlineLocalId
      : !isOffline && !currentIsOffline && this.expandedOrder?.id === order.id;
    const opening = !isSame;
    this.expandedOrder = isSame ? null : order;
    this.dataSource.data = this.buildTableRows();
    if (opening && this.expandedOrder) this.scrollToDetailOnce = true;
  }

  cancelOrder(order: OrderResponse | OfflineOrderRow): void {
    if ('isOfflineRow' in order) {
      this.snackBar.open('Cannot cancel an offline order from here. It will be created when synced.', 'Close', { duration: 4000 });
      return;
    }
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

  refundOrder(order: OrderResponse | OfflineOrderRow): void {
    if ('isOfflineRow' in order) return;
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Refund Order', message: `Issue refund for Order #${order.id}?`, confirmText: 'Refund' }
    }).afterClosed().subscribe(() => {
      this.snackBar.open('Refund issued — feature coming soon', 'Close', { duration: 3000 });
    });
  }

  printReceipt(order: OrderResponse | OfflineOrderRow): void {
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

  emailReceipt(order: OrderResponse | OfflineOrderRow): void {
    if ('isOfflineRow' in order) {
      this.snackBar.open('Email receipt is not available for offline orders until they are synced.', 'Close', { duration: 4000 });
      return;
    }
    this.orderService.sendReceipt(order.id).subscribe({
      next: () => this.snackBar.open('Receipt sent to customer email', 'Close', { duration: 4000 }),
      error: err => {
        const body = err.error ?? {};
        const msg = body.message || body.errorCode || 'Failed to send receipt';
        const code = body.errorCode as string | undefined;
        const hint = code === 'EM004'
          ? ' Verify /me/sendMail in Graph Explorer or use SMTP in Settings.'
          : code === 'EM001'
            ? ' Set Company email in Settings.'
            : code === 'EM002'
              ? ' Configure SMTP or Microsoft sign-in in Settings.'
              : '';
        this.snackBar.open(msg + hint, 'Close', { duration: 7000 });
      }
    });
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
