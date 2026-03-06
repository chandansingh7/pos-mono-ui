import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReportService } from '../../core/services/report.service';
import { CompanyService } from '../../core/services/company.service';
import { SharedModule } from '../../shared/shared.module';
import { ReportsComponent } from './reports.component';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let reportService: jasmine.SpyObj<ReportService>;
  let companyService: jasmine.SpyObj<CompanyService>;

  const mockReport = {
    period: 'Daily: 2026-02-06',
    totalOrders: 12,
    totalRevenue: 450.5,
    averageOrderValue: 37.54,
    topProducts: [{ productId: 1, productName: 'Item A', unitsSold: 5 }]
  };

  beforeEach(async () => {
    reportService = jasmine.createSpyObj('ReportService', [
      'getDailyReport',
      'getMonthlyReport',
      'getRangeReport',
      'downloadDailyExcel',
      'downloadMonthlyExcel',
      'downloadRangeExcel'
    ]);
    reportService.getDailyReport.and.returnValue(of({ success: true, data: mockReport, message: null, errorCode: null }));
    reportService.getMonthlyReport.and.returnValue(of({ success: true, data: { ...mockReport, period: 'Monthly: 2026-02' }, message: null, errorCode: null }));
    reportService.getRangeReport.and.returnValue(of({ success: true, data: { ...mockReport, period: 'Range: 2026-01-01 to 2026-01-07' }, message: null, errorCode: null }));
    reportService.downloadDailyExcel.and.returnValue(of(new Blob()));
    reportService.downloadMonthlyExcel.and.returnValue(of(new Blob()));
    reportService.downloadRangeExcel.and.returnValue(of(new Blob()));

    companyService = jasmine.createSpyObj('CompanyService', ['getCached']);
    companyService.getCached.and.returnValue({ id: 1, name: 'Test Store', displayCurrency: 'USD' } as any);

    await TestBed.configureTestingModule({
      declarations: [ReportsComponent],
      imports: [SharedModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: ReportService, useValue: reportService },
        { provide: CompanyService, useValue: companyService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load daily report for Today on init', () => {
    fixture.detectChanges();
    expect(reportService.getDailyReport).toHaveBeenCalled();
    expect(component.dailyReport?.totalOrders).toBe(12);
    expect(component.dailyPeriod).toBe('today');
  });

  it('should switch to Yesterday and reload', () => {
    fixture.detectChanges();
    reportService.getDailyReport.calls.reset();
    component.selectDailyPeriod('yesterday');
    expect(component.dailyPeriod).toBe('yesterday');
    expect(reportService.getDailyReport).toHaveBeenCalled();
  });

  it('should not reload when selecting same period', () => {
    fixture.detectChanges();
    reportService.getDailyReport.calls.reset();
    component.selectDailyPeriod('today');
    expect(reportService.getDailyReport).not.toHaveBeenCalled();
  });

  it('should load monthly report when switching to monthly tab', () => {
    fixture.detectChanges();
    reportService.getMonthlyReport.calls.reset();
    component.switchTab('monthly');
    expect(reportService.getMonthlyReport).toHaveBeenCalled();
    expect(component.monthlyReport?.totalOrders).toBe(12);
  });

  it('should switch between This month and Last month', () => {
    fixture.detectChanges();
    component.switchTab('monthly');
    reportService.getMonthlyReport.calls.reset();
    component.selectMonthlyPeriod('last_month');
    expect(component.monthlyPeriod).toBe('last_month');
    expect(reportService.getMonthlyReport).toHaveBeenCalled();
  });

  it('getDailyDate returns today ISO string when today selected', () => {
    component.dailyPeriod = 'today';
    const today = new Date().toISOString().split('T')[0];
    expect(component.getDailyDate()).toBe(today);
  });

  it('getMonthlyYearMonth returns current year/month for this_month', () => {
    component.monthlyPeriod = 'this_month';
    const d = new Date();
    expect(component.getMonthlyYearMonth()).toEqual({ year: d.getFullYear(), month: d.getMonth() + 1 });
  });

  it('downloadDailyExcel calls service with correct date', () => {
    fixture.detectChanges();
    component.dailyPeriod = 'today';
    const today = new Date().toISOString().split('T')[0];
    component.downloadDailyExcel();
    expect(reportService.downloadDailyExcel).toHaveBeenCalledWith(today);
  });

  it('compareCompareDisabled returns true when custom period A has invalid range', () => {
    component.comparePeriodA = 'custom';
    component.compareCustomFromA = '2026-01-10';
    component.compareCustomToA = '2026-01-01';
    expect(component.compareCompareDisabled()).toBe(true);
    component.compareCustomToA = '2026-01-15';
    expect(component.compareCompareDisabled()).toBe(false);
  });

  it('loadWeekly calls getRangeReport with week range', () => {
    fixture.detectChanges();
    reportService.getRangeReport.calls.reset();
    component.switchTab('weekly');
    expect(reportService.getRangeReport).toHaveBeenCalled();
    expect(component.weeklyReport?.period).toBeDefined();
  });
});
