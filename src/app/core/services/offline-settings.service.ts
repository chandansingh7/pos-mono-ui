import { Injectable } from '@angular/core';
import { CompanyService } from './company.service';
import { CompanyResponse } from '../models/company.models';

export interface OfflineSettings {
  allowDashboard: boolean;
  allowOrders: boolean;
  allowPos: boolean;
}

const STORAGE_KEY = 'pos_offline_settings_v1';

const DEFAULT_SETTINGS: OfflineSettings = {
  allowDashboard: true,
  allowOrders: false,
  allowPos: false
};

function fromCompany(c: CompanyResponse | null): OfflineSettings {
  if (!c) return { ...DEFAULT_SETTINGS };
  return {
    allowDashboard: c.offlineAllowDashboard ?? DEFAULT_SETTINGS.allowDashboard,
    allowOrders: c.offlineAllowOrders ?? DEFAULT_SETTINGS.allowOrders,
    allowPos: c.offlineAllowPos ?? DEFAULT_SETTINGS.allowPos
  };
}

/**
 * Resolves offline settings: admin-controlled company settings (from API) take precedence.
 * Pass company when available (e.g. from IndexedDB when offline); otherwise uses CompanyService cache or localStorage.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSettingsService {

  constructor(private companyService: CompanyService) {}

  /**
   * Get offline settings. Pass company when you have it (e.g. POS passes this.company from IndexedDB when offline).
   */
  getSettings(company?: CompanyResponse | null): OfflineSettings {
    if (company) return fromCompany(company);
    const cached = this.companyService.getCached();
    if (cached) return fromCompany(cached);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<OfflineSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /** Update local fallback. Admin settings are saved via company API in Settings. */
  updateSettings(patch: Partial<OfflineSettings>): OfflineSettings {
    const merged = { ...this.getSettings(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
}
