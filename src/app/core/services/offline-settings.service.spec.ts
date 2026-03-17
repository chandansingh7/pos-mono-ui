import { TestBed } from '@angular/core/testing';
import { OfflineSettingsService } from './offline-settings.service';
import { CompanyService } from './company.service';

describe('OfflineSettingsService', () => {
  let service: OfflineSettingsService;
  let companyService: jasmine.SpyObj<CompanyService>;

  beforeEach(() => {
    localStorage.clear();
    companyService = jasmine.createSpyObj('CompanyService', [], { getCached: () => null });
    TestBed.configureTestingModule({
      providers: [
        OfflineSettingsService,
        { provide: CompanyService, useValue: companyService }
      ]
    });
    service = TestBed.inject(OfflineSettingsService);
  });

  it('should return defaults when nothing stored', () => {
    const s = service.getSettings();
    expect(s.allowDashboard).toBeTrue();
    expect(s.allowOrders).toBeFalse();
    expect(s.allowPos).toBeFalse();
  });

  it('should use company settings when provided', () => {
    const s = service.getSettings({ offlineAllowPos: true } as any);
    expect(s.allowPos).toBeTrue();
  });

  it('should persist updates to localStorage fallback', () => {
    const updated = service.updateSettings({ allowOrders: true });
    expect(updated.allowOrders).toBeTrue();
    const again = service.getSettings();
    expect(again.allowOrders).toBeTrue();
  });
});
