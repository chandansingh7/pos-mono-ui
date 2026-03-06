import { Component, OnInit } from '@angular/core';
import { ReportService } from '../../core/services/report.service';
import { CompanyService } from '../../core/services/company.service';
import { SalesReportResponse } from '../../core/models/report.models';

/** Fixed period types — no custom date range or period comparison (HCI best practice). */
export type DailyPeriod = 'today' | 'yesterday';
export type MonthlyPeriod = 'this_month' | 'last_month';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  activeTab: 'daily' | 'monthly' = 'daily';
  dailyPeriod: DailyPeriod = 'today';
  monthlyPeriod: MonthlyPeriod = 'this_month';

  dailyReport: SalesReportResponse | null = null;
  monthlyReport: SalesReportResponse | null = null;
  loadingDaily = false;
  loadingMonthly = false;

  topProductsColumns = ['rank', 'productName', 'unitsSold'];

  constructor(
    private reportService: ReportService,
    private companyService: CompanyService
  ) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  ngOnInit(): void {
    this.loadDaily();
  }

  /** Returns ISO date string for the selected daily period. */
  getDailyDate(): string {
    const d = new Date();
    if (this.dailyPeriod === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    return d.toISOString().split('T')[0];
  }

  /** Returns { year, month } for the selected monthly period. */
  getMonthlyYearMonth(): { year: number; month: number } {
    const d = new Date();
    if (this.monthlyPeriod === 'last_month') {
      d.setMonth(d.getMonth() - 1);
    }
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  selectDailyPeriod(period: DailyPeriod): void {
    if (this.dailyPeriod === period) return;
    this.dailyPeriod = period;
    this.loadDaily();
  }

  selectMonthlyPeriod(period: MonthlyPeriod): void {
    if (this.monthlyPeriod === period) return;
    this.monthlyPeriod = period;
    this.loadMonthly();
  }

  loadDaily(): void {
    this.loadingDaily = true;
    const dateStr = this.getDailyDate();
    this.reportService.getDailyReport(dateStr).subscribe({
      next: res => { this.dailyReport = res.data; this.loadingDaily = false; },
      error: () => { this.loadingDaily = false; }
    });
  }

  loadMonthly(): void {
    this.loadingMonthly = true;
    const { year, month } = this.getMonthlyYearMonth();
    this.reportService.getMonthlyReport(year, month).subscribe({
      next: res => { this.monthlyReport = res.data; this.loadingMonthly = false; },
      error: () => { this.loadingMonthly = false; }
    });
  }

  switchTab(tab: 'daily' | 'monthly'): void {
    this.activeTab = tab;
    if (tab === 'monthly' && !this.monthlyReport) this.loadMonthly();
  }

  downloadDailyExcel(): void {
    const dateStr = this.getDailyDate();
    this.reportService.downloadDailyExcel(dateStr).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-daily-${dateStr}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  downloadMonthlyExcel(): void {
    const { year, month } = this.getMonthlyYearMonth();
    this.reportService.downloadMonthlyExcel(year, month).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-monthly-${year}-${String(month).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }
}
