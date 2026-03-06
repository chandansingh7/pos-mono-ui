import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportService } from '../../core/services/report.service';
import { CompanyService } from '../../core/services/company.service';
import { SalesReportResponse } from '../../core/models/report.models';

export type ReportTab = 'daily' | 'weekly' | 'monthly' | 'custom' | 'compare';

export type DailyPeriod = 'today' | 'yesterday';
export type WeeklyPeriod = 'this_week' | 'last_week';
export type MonthlyPeriod = 'this_month' | 'last_month';

/** Fixed period key used for API (daily/weekly use range; monthly can use monthly API). */
export type FixedPeriodKey = DailyPeriod | WeeklyPeriod | MonthlyPeriod;

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  activeTab: ReportTab = 'daily';
  dailyPeriod: DailyPeriod = 'today';
  weeklyPeriod: WeeklyPeriod = 'this_week';
  monthlyPeriod: MonthlyPeriod = 'this_month';

  customFrom: string | null = null;
  customTo: string | null = null;

  comparePeriodA: FixedPeriodKey | 'custom' = 'this_month';
  comparePeriodB: FixedPeriodKey | 'custom' = 'last_month';
  compareCustomFromA: string | null = null;
  compareCustomToA: string | null = null;
  compareCustomFromB: string | null = null;
  compareCustomToB: string | null = null;

  dailyReport: SalesReportResponse | null = null;
  weeklyReport: SalesReportResponse | null = null;
  monthlyReport: SalesReportResponse | null = null;
  customReport: SalesReportResponse | null = null;
  compareReportA: SalesReportResponse | null = null;
  compareReportB: SalesReportResponse | null = null;

  loadingDaily = false;
  loadingWeekly = false;
  loadingMonthly = false;
  loadingCustom = false;
  loadingCompare = false;

  topProductsColumns = ['rank', 'productName', 'unitsSold'];

  fixedPeriodOptions: { value: FixedPeriodKey; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This week' },
    { value: 'last_week', label: 'Last week' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' }
  ];

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

  private toISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getStartOfWeek(d: Date): Date {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  private getEndOfWeek(d: Date): Date {
    const start = this.getStartOfWeek(d);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }

  getDailyDate(): string {
    const d = new Date();
    if (this.dailyPeriod === 'yesterday') d.setDate(d.getDate() - 1);
    return this.toISO(d);
  }

  getWeeklyRange(): { from: string; to: string } {
    const d = new Date();
    if (this.weeklyPeriod === 'last_week') {
      const start = this.getStartOfWeek(d);
      start.setDate(start.getDate() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: this.toISO(start), to: this.toISO(end) };
    }
    const start = this.getStartOfWeek(d);
    const end = this.getEndOfWeek(d);
    return { from: this.toISO(start), to: this.toISO(end) };
  }

  getMonthlyYearMonth(): { year: number; month: number } {
    const d = new Date();
    if (this.monthlyPeriod === 'last_month') d.setMonth(d.getMonth() - 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  getRangeForFixedPeriod(key: FixedPeriodKey): { from: string; to: string } | { date: string } | { year: number; month: number } {
    const d = new Date();
    switch (key) {
      case 'today': {
        const s = this.toISO(d);
        return { from: s, to: s };
      }
      case 'yesterday': {
        d.setDate(d.getDate() - 1);
        const s = this.toISO(d);
        return { from: s, to: s };
      }
      case 'this_week': {
        const start = this.getStartOfWeek(d);
        const end = this.getEndOfWeek(d);
        return { from: this.toISO(start), to: this.toISO(end) };
      }
      case 'last_week': {
        const start = this.getStartOfWeek(d);
        start.setDate(start.getDate() - 7);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { from: this.toISO(start), to: this.toISO(end) };
      }
      case 'this_month':
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      case 'last_month': {
        d.setMonth(d.getMonth() - 1);
        return { year: d.getFullYear(), month: d.getMonth() + 1 };
      }
    }
  }

  selectDailyPeriod(period: DailyPeriod): void {
    if (this.dailyPeriod === period) return;
    this.dailyPeriod = period;
    this.loadDaily();
  }

  selectWeeklyPeriod(period: WeeklyPeriod): void {
    if (this.weeklyPeriod === period) return;
    this.weeklyPeriod = period;
    this.loadWeekly();
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

  loadWeekly(): void {
    this.loadingWeekly = true;
    const { from, to } = this.getWeeklyRange();
    this.reportService.getRangeReport(from, to).subscribe({
      next: res => { this.weeklyReport = res.data; this.loadingWeekly = false; },
      error: () => { this.loadingWeekly = false; }
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

  loadCustom(): void {
    if (!this.customFrom || !this.customTo) return;
    if (this.customFrom > this.customTo) return;
    this.loadingCustom = true;
    this.reportService.getRangeReport(this.customFrom, this.customTo).subscribe({
      next: res => { this.customReport = res.data; this.loadingCustom = false; },
      error: () => { this.loadingCustom = false; }
    });
  }

  loadCompare(): void {
    this.compareReportA = null;
    this.compareReportB = null;
    this.loadingCompare = true;
    const loadA = this.fetchReportForCompare(
      this.comparePeriodA,
      this.comparePeriodA === 'custom' ? { from: this.compareCustomFromA!, to: this.compareCustomToA! } : null
    );
    const loadB = this.fetchReportForCompare(
      this.comparePeriodB,
      this.comparePeriodB === 'custom' ? { from: this.compareCustomFromB!, to: this.compareCustomToB! } : null
    );
    loadA.subscribe({
      next: res => { this.compareReportA = res.data; this.maybeDoneCompare(); },
      error: () => { this.loadingCompare = false; }
    });
    loadB.subscribe({
      next: res => { this.compareReportB = res.data; this.maybeDoneCompare(); },
      error: () => { this.loadingCompare = false; }
    });
  }

  private fetchReportForCompare(
    period: FixedPeriodKey | 'custom',
    customRange: { from: string; to: string } | null
  ): Observable<{ data: SalesReportResponse | null }> {
    if (period === 'custom' && customRange) {
      return this.reportService.getRangeReport(customRange.from, customRange.to);
    }
    const range = this.getRangeForFixedPeriod(period as FixedPeriodKey);
    if ('year' in range && 'month' in range) {
      return this.reportService.getMonthlyReport(range.year, range.month);
    }
    if ('date' in range) {
      return this.reportService.getDailyReport(range.date);
    }
    return this.reportService.getRangeReport(range.from, range.to);
  }

  private maybeDoneCompare(): void {
    if (this.compareReportA != null && this.compareReportB != null) {
      this.loadingCompare = false;
    }
  }

  switchTab(tab: ReportTab): void {
    this.activeTab = tab;
    if (tab === 'weekly' && !this.weeklyReport) this.loadWeekly();
    if (tab === 'monthly' && !this.monthlyReport) this.loadMonthly();
  }

  downloadDailyExcel(): void {
    const dateStr = this.getDailyDate();
    this.reportService.downloadDailyExcel(dateStr).subscribe({
      next: blob => this.downloadBlob(blob, `sales-daily-${dateStr}.xlsx`),
      error: () => {}
    });
  }

  downloadWeeklyExcel(): void {
    const { from, to } = this.getWeeklyRange();
    this.reportService.downloadRangeExcel(from, to).subscribe({
      next: blob => this.downloadBlob(blob, `sales-weekly-${from}-to-${to}.xlsx`),
      error: () => {}
    });
  }

  downloadMonthlyExcel(): void {
    const { year, month } = this.getMonthlyYearMonth();
    this.reportService.downloadMonthlyExcel(year, month).subscribe({
      next: blob => this.downloadBlob(blob, `sales-monthly-${year}-${String(month).padStart(2, '0')}.xlsx`),
      error: () => {}
    });
  }

  downloadCustomExcel(): void {
    if (!this.customFrom || !this.customTo) return;
    this.reportService.downloadRangeExcel(this.customFrom, this.customTo).subscribe({
      next: blob => this.downloadBlob(blob, `sales-range-${this.customFrom}-to-${this.customTo}.xlsx`),
      error: () => {}
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Delta % for comparison: (current - previous) / previous * 100. */
  deltaPercent(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  }

  periodLabel(period: FixedPeriodKey | 'custom'): string {
    if (period === 'custom') return 'Custom';
    return this.fixedPeriodOptions.find(o => o.value === period)?.label ?? period;
  }

  compareCompareDisabled(): boolean {
    if (this.comparePeriodA === 'custom' && (!this.compareCustomFromA || !this.compareCustomToA || this.compareCustomFromA > this.compareCustomToA)) return true;
    if (this.comparePeriodB === 'custom' && (!this.compareCustomFromB || !this.compareCustomToB || this.compareCustomFromB > this.compareCustomToB)) return true;
    return false;
  }
}
