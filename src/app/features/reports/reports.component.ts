import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { CompanyService } from '../../core/services/company.service';
import { SalesReportResponse } from '../../core/models/report.models';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  activeTab: 'daily' | 'monthly' = 'daily';
  dailyReport: SalesReportResponse | null = null;
  monthlyReport: SalesReportResponse | null = null;
  loadingDaily = false;
  loadingMonthly = false;

  dateControl = new FormControl(new Date());
  yearControl = new FormControl(new Date().getFullYear());
  monthControl = new FormControl(new Date().getMonth() + 1);

  topProductsColumns = ['rank', 'productName', 'unitsSold'];

  months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  constructor(
    private reportService: ReportService,
    private companyService: CompanyService
  ) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  ngOnInit(): void { this.loadDaily(); }

  loadDaily(): void {
    this.loadingDaily = true;
    const date = this.dateControl.value;
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    this.reportService.getDailyReport(dateStr).subscribe({
      next: res => { this.dailyReport = res.data; this.loadingDaily = false; },
      error: () => { this.loadingDaily = false; }
    });
  }

  loadMonthly(): void {
    this.loadingMonthly = true;
    this.reportService.getMonthlyReport(
      this.yearControl.value ?? undefined,
      this.monthControl.value ?? undefined
    ).subscribe({
      next: res => { this.monthlyReport = res.data; this.loadingMonthly = false; },
      error: () => { this.loadingMonthly = false; }
    });
  }

  switchTab(tab: 'daily' | 'monthly'): void {
    this.activeTab = tab;
    if (tab === 'monthly' && !this.monthlyReport) this.loadMonthly();
  }

  downloadDailyExcel(): void {
    const date = this.dateControl.value;
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    this.reportService.downloadDailyExcel(dateStr).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-daily-${dateStr || new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {}
    });
  }

  downloadMonthlyExcel(): void {
    const year = this.yearControl.value ?? new Date().getFullYear();
    const month = this.monthControl.value ?? new Date().getMonth() + 1;
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
