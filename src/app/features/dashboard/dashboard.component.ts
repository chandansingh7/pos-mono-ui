import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReportService } from '../../core/services/report.service';
import { InventoryService } from '../../core/services/inventory.service';
import { OrderService } from '../../core/services/order.service';
import { SalesReportResponse } from '../../core/models/report.models';
import { InventoryResponse } from '../../core/models/inventory.models';
import { OrderResponse } from '../../core/models/order.models';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  dailyReport: SalesReportResponse | null = null;
  monthlyReport: SalesReportResponse | null = null;
  lowStockItems: InventoryResponse[] = [];
  recentOrders: OrderResponse[] = [];

  loading = true;
  today = new Date();

  topProductsColumns = ['rank', 'productName', 'unitsSold'];
  recentOrdersColumns = ['id', 'customer', 'items', 'total', 'payment', 'status', 'time'];

  constructor(
    private reportService: ReportService,
    private inventoryService: InventoryService,
    private orderService: OrderService
  ) {}

  ngOnInit(): void {
    forkJoin({
      daily:    this.reportService.getDailyReport(undefined, true).pipe(catchError(() => of({ data: null, success: false, message: null, errorCode: null }))),
      monthly:  this.reportService.getMonthlyReport(undefined, undefined, true).pipe(catchError(() => of({ data: null, success: false, message: null, errorCode: null }))),
      lowStock: this.inventoryService.getLowStock(true).pipe(catchError(() => of({ data: [], success: false, message: null, errorCode: null }))),
      orders:   this.orderService.getAll(0, 5).pipe(catchError(() => of({ data: { content: [], totalElements: 0, totalPages: 0, size: 5, number: 0 }, success: false, message: null, errorCode: null })))
    }).subscribe({
      next: ({ daily, monthly, lowStock, orders }) => {
        this.dailyReport   = daily.data;
        this.monthlyReport = monthly.data;
        this.lowStockItems = (lowStock.data as InventoryResponse[]) || [];
        this.recentOrders  = (orders.data as any)?.content || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get maxUnits(): number {
    const products = this.dailyReport?.topProducts || [];
    return products.length ? Math.max(...products.map(p => p.unitsSold)) : 1;
  }

  get currentMonth(): string {
    return this.today.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'success',
      CANCELLED: 'danger',
      REFUNDED:  'warn',
      PENDING:   'info'
    };
    return map[status] || 'info';
  }

  paymentIcon(method: string): string {
    const map: Record<string, string> = {
      CASH:           'payments',
      CREDIT_CARD:    'credit_card',
      DEBIT_CARD:     'credit_card',
      MOBILE_PAYMENT: 'phone_iphone'
    };
    return map[method] || 'payment';
  }

  paymentLabel(method: string): string {
    const map: Record<string, string> = {
      CASH:           'Cash',
      CREDIT_CARD:    'Credit',
      DEBIT_CARD:     'Debit',
      MOBILE_PAYMENT: 'Mobile'
    };
    return map[method] || method;
  }

  stockStatusLabel(status: string): string {
    const map: Record<string, string> = {
      OUT_OF_STOCK: 'Out of Stock',
      LOW_STOCK:    'Low Stock',
      IN_STOCK:     'In Stock'
    };
    return map[status] || status;
  }
}
