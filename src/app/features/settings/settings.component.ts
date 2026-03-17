import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompanyResponse, RECEIPT_PAPER_SIZES, DISPLAY_CURRENCIES, DISPLAY_LOCALES, POS_LAYOUTS, WEIGHT_UNITS, VOLUME_UNITS, EMAIL_PROVIDERS } from '../../core/models/company.models';
import { COUNTRIES, getDefaultWeightUnitForCountry, getDefaultVolumeUnitForCountry } from '../../core/data/countries.data';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';
import { LabelPrintTemplate, LabelPrintTemplateId, resolveLabelPrintTemplate } from '../labels/label-print-template.util';
import { PosLocalStoreService, OfflineDailyReport } from '../../core/services/pos-local-store.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  company: CompanyResponse | null = null;
  receiptPaperSizes = RECEIPT_PAPER_SIZES;
  displayCurrencies = DISPLAY_CURRENCIES;
  displayLocales = DISPLAY_LOCALES;
  posLayouts = POS_LAYOUTS;
  weightUnits = WEIGHT_UNITS;
  volumeUnits = VOLUME_UNITS;
  countries = COUNTRIES;
  emailProviders = EMAIL_PROVIDERS;
  logoLoadError = false;
  faviconLoadError = false;
  verifyingEmail = false;

  syncDiagnostics: { pendingCount: number; failedCount: number; lastSyncAt?: string } | null = null;
  offlineReport: OfflineDailyReport | null = null;
  offlineReportPaymentEntries: Array<{ method: string; amount: number }> = [];

  labelTemplates: LabelPrintTemplate[] = [
    { id: 'A4_2x4', name: 'A4 — 2×4 (8 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'A4_2x5', name: 'A4 — 2×5 (10 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 5, gapMm: 5, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'A4_3x4', name: 'A4 — 3×4 (12 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 3, rows: 4, gapMm: 4, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'THERMAL_58x40', name: 'Thermal — 58×40 mm (1 per label)', pageWidthMm: 58, pageHeightMm: 40, columns: 1, rows: 1, gapMm: 0, pagePaddingMm: 2, labelPaddingMm: 2 },
    { id: 'THERMAL_80x50', name: 'Thermal — 80×50 mm (1 per label)', pageWidthMm: 80, pageHeightMm: 50, columns: 1, rows: 1, gapMm: 0, pagePaddingMm: 2, labelPaddingMm: 2 },
    { id: 'CUSTOM', name: 'Custom (basic layout)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 },
  ];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private localStore: PosLocalStoreService,
    private offlineSync: OfflineSyncService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      address: [''],
      phone: [''],
      email: [''],
      taxId: [''],
      website: [''],
      receiptHeaderText: [''],
      receiptFooterText: [''],
      receiptPaperSize: ['80mm'],
      displayCurrency: ['USD'],
      locale: ['en-US'],
      countryCode: [null as string | null],
      weightUnit: ['kg'],
      volumeUnit: ['L'],
      posQuickShiftControls: [false],
      shiftMaxDifferenceAbsolute: [null],
      shiftMinOpenMinutes: [null],
      shiftMaxOpenHours: [null],
      shiftRequireSameDay: [false],
      posLayout: ['grid'],
      labelShowName: [true],
      labelShowSku: [true],
      labelShowPrice: [true],
      labelTemplateId: ['A4_2x4'],
      labelTemplateColumns: [2],
      labelTemplateRows: [4],
      labelTemplateGapMm: [6],
      labelTemplatePagePaddingMm: [8],
      labelTemplateLabelPaddingMm: [4],
      labelPageWidthMm: [58],
      labelPageHeightMm: [40],
      smtpProvider: [null as string | null],
      smtpHost: [''],
      smtpPort: [587],
      smtpUsername: [''],
      smtpPassword: [''],
      smtpStartTls: [true],
      emailSendMethod: ['SMTP'],
      offlineAllowDashboard: [true],
      offlineAllowOrders: [false],
      offlineAllowPos: [false]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }

    this.load();
    this.loadSyncDiagnostics();

    // Microsoft connect runs in a popup; backend callback redirects to /auth/microsoft-callback which notifies us here.
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        if (event?.data?.type === 'ms_connected') {
          this.load();
          if (event.data?.success !== false) {
            this.snackBar.open('Microsoft account connected for receipts. You can send email.', 'Close', { duration: 4000 });
          } else {
            this.snackBar.open('Microsoft connection failed. Try again from Settings.', 'Close', { duration: 5000 });
          }
        }
      });
    }
  }

  loadSyncDiagnostics(): void {
    this.localStore.init().then(async () => {
      const [pendingCount, failedCount, syncState] = await Promise.all([
        this.localStore.getPendingCount(),
        this.localStore.getFailedCount(),
        this.localStore.getSyncState()
      ]);
      this.syncDiagnostics = {
        pendingCount,
        failedCount,
        lastSyncAt: syncState?.lastFullSyncAt || undefined
      };
    });
    this.loadOfflineReport();
  }

  loadOfflineReport(): void {
    this.localStore.init().then(async () => {
      const report = await this.localStore.getOfflineReportToday();
      this.offlineReport = report.orderCount > 0 ? report : null;
      this.offlineReportPaymentEntries = Object.entries(report.paymentBreakdown)
        .map(([method, amount]) => ({ method, amount }))
        .filter(e => e.method !== 'CASH'); // cash is shown separately
    });
  }

  get currencyCode(): string {
    return this.form?.value?.displayCurrency || this.company?.displayCurrency || 'USD';
  }

  async retryFailedSync(): Promise<void> {
    await this.localStore.init();
    const count = await this.localStore.resetAllFailedToPending();
    this.loadSyncDiagnostics();
    this.offlineSync.triggerSync();
    this.snackBar.open(count > 0 ? `${count} failed order(s) queued for retry.` : 'No failed orders to retry.', 'Close', { duration: 3000 });
  }

  /** When user selects a country, pre-select weight and volume units used in that country. */
  onCountryChange(countryCode: string | null): void {
    this.form.patchValue({
      weightUnit: getDefaultWeightUnitForCountry(countryCode),
      volumeUnit: getDefaultVolumeUnitForCountry(countryCode)
    }, { emitEvent: false });
  }

  /** Resolved logo URL so images load from API when app is on a different origin. */
  get logoImageUrl(): string | null {
    return resolveProductImageUrl(this.company?.logoUrl);
  }

  /** Resolved favicon URL so images load from API when app is on a different origin. */
  get faviconImageUrl(): string | null {
    return resolveProductImageUrl(this.company?.faviconUrl);
  }

  onLogoLoadError(): void {
    this.logoLoadError = true;
  }

  onFaviconLoadError(): void {
    this.faviconLoadError = true;
  }

  load(): void {
    this.logoLoadError = false;
    this.faviconLoadError = false;
    this.loading = true;
    this.companyService.get(true).subscribe({
      next: res => {
        this.company = res.data ?? null;
        this.loading = false;
        if (this.company) {
          this.form.patchValue({
            name: this.company.name ?? '',
            address: this.company.address ?? '',
            phone: this.company.phone ?? '',
            email: this.company.email ?? '',
            smtpProvider: this.company.smtpProvider ?? null,
            smtpHost: this.company.smtpHost ?? '',
            smtpPort: this.company.smtpPort ?? 587,
            smtpUsername: this.company.smtpUsername ?? '',
            smtpPassword: '', // never load password
            smtpStartTls: this.company.smtpStartTls ?? true,
            emailSendMethod: this.company.emailSendMethod ?? 'SMTP',
            taxId: this.company.taxId ?? '',
            website: this.company.website ?? '',
            receiptHeaderText: this.company.receiptHeaderText ?? '',
            receiptFooterText: this.company.receiptFooterText ?? '',
            receiptPaperSize: this.company.receiptPaperSize ?? '80mm',
            displayCurrency: this.company.displayCurrency ?? 'USD',
            locale: this.company.locale ?? 'en-US',
            countryCode: this.company.countryCode ?? null,
            weightUnit: this.company.weightUnit ?? 'kg',
            volumeUnit: this.company.volumeUnit ?? 'L',
            posQuickShiftControls: this.company.posQuickShiftControls ?? false,
            shiftMaxDifferenceAbsolute: this.company.shiftMaxDifferenceAbsolute ?? null,
            shiftMinOpenMinutes: this.company.shiftMinOpenMinutes ?? null,
            shiftMaxOpenHours: this.company.shiftMaxOpenHours ?? null,
            shiftRequireSameDay: this.company.shiftRequireSameDay ?? false,
            posLayout: this.company.posLayout ?? 'grid',
            labelShowName: this.company.labelShowName ?? true,
            labelShowSku: this.company.labelShowSku ?? true,
            labelShowPrice: this.company.labelShowPrice ?? true,
            labelTemplateId: this.company.labelTemplateId ?? 'A4_2x4',
            labelTemplateColumns: this.company.labelTemplateColumns ?? 2,
            labelTemplateRows: this.company.labelTemplateRows ?? 4,
            labelTemplateGapMm: this.company.labelTemplateGapMm ?? 6,
            labelTemplatePagePaddingMm: this.company.labelTemplatePagePaddingMm ?? 8,
            labelTemplateLabelPaddingMm: this.company.labelTemplateLabelPaddingMm ?? 4,
            labelPageWidthMm: this.company.labelPageWidthMm ?? 58,
            labelPageHeightMm: this.company.labelPageHeightMm ?? 40,
            offlineAllowDashboard: this.company.offlineAllowDashboard ?? true,
            offlineAllowOrders: this.company.offlineAllowOrders ?? false,
            offlineAllowPos: this.company.offlineAllowPos ?? false
          });
        } else {
          this.form.patchValue({
            name: 'My Store',
            receiptPaperSize: '80mm',
            displayCurrency: 'USD',
            locale: 'en-US',
            countryCode: null,
            weightUnit: 'kg',
            volumeUnit: 'L',
            posQuickShiftControls: false,
            shiftMaxDifferenceAbsolute: null,
            shiftMinOpenMinutes: null,
            shiftMaxOpenHours: null,
            shiftRequireSameDay: false,
            posLayout: 'grid',
            labelShowName: true,
            labelShowSku: true,
            labelShowPrice: true,
            labelTemplateId: 'A4_2x4',
            labelTemplateColumns: 2,
            labelTemplateRows: 4,
            labelTemplateGapMm: 6,
            labelTemplatePagePaddingMm: 8,
            labelTemplateLabelPaddingMm: 4,
            labelPageWidthMm: 58,
            labelPageHeightMm: 40,
            offlineAllowDashboard: true,
            offlineAllowOrders: false,
            offlineAllowPos: false
          });
        }
        this.form.markAsPristine();
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    if (this.form.pristine) {
      this.snackBar.open('No changes to save.', 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    const payload = {
      ...this.form.value,
      logoUrl: this.company?.logoUrl,
      faviconUrl: this.company?.faviconUrl
    };
    this.companyService.update(payload).subscribe({
      next: () => {
        this.saving = false;
        this.form.markAsPristine();
        this.snackBar.open('Settings saved', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving = false;
        this.snackBar.open('Failed to save settings', 'Close', { duration: 3000 });
      }
    });
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image (PNG, JPG, etc.)', 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.companyService.uploadLogo(file).subscribe({
      next: res => {
        this.saving = false;
        this.logoLoadError = false;
        this.company = res.data ?? this.company;
        this.snackBar.open('Logo uploaded', 'Close', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Logo upload failed', 'Close', { duration: 4000 });
      }
    });
  }

  onFaviconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select an image (PNG, ICO, etc.)', 'Close', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.companyService.uploadFavicon(file).subscribe({
      next: res => {
        this.saving = false;
        this.faviconLoadError = false;
        this.company = res.data ?? this.company;
        this.snackBar.open('Favicon uploaded', 'Close', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err.error?.message || 'Favicon upload failed', 'Close', { duration: 4000 });
      }
    });
  }

  get labelTemplateId(): LabelPrintTemplateId {
    const raw = this.form.get('labelTemplateId')?.value as LabelPrintTemplateId | null;
    const allowed: LabelPrintTemplateId[] = ['A4_2x4', 'A4_2x5', 'A4_3x4', 'THERMAL_58x40', 'THERMAL_80x50', 'CUSTOM'];
    return raw && allowed.includes(raw) ? raw : 'A4_2x4';
  }

  get labelLayoutPreview(): LabelPrintTemplate {
    const tpl = resolveLabelPrintTemplate(this.labelTemplates, this.labelTemplateId, {
      columns: this.form.get('labelTemplateColumns')?.value,
      rows: this.form.get('labelTemplateRows')?.value,
      gapMm: this.form.get('labelTemplateGapMm')?.value,
      pagePaddingMm: this.form.get('labelTemplatePagePaddingMm')?.value,
      labelPaddingMm: this.form.get('labelTemplateLabelPaddingMm')?.value,
      pageWidthMm: this.form.get('labelPageWidthMm')?.value,
      pageHeightMm: this.form.get('labelPageHeightMm')?.value
    });
    return tpl;
  }

  get labelPreviewBoxes(): number[] {
    const tpl = this.labelLayoutPreview;
    const count = Math.max(1, tpl.columns * tpl.rows);
    return Array.from({ length: count }, (_, i) => i);
  }

  /** Whether email setup has been verified (green tick). */
  get emailVerified(): boolean {
    return !!this.company?.emailVerifiedAt;
  }

  get microsoftConnected(): boolean {
    return !!this.company?.msConnectedAt;
  }

  /** When provider changes to Gmail/Outlook, pre-fill host/port. */
  onEmailProviderChange(provider: string): void {
    const preset = this.emailProviders.find(p => p.value === provider);
    if (preset?.host) {
      this.form.patchValue({
        smtpHost: preset.host,
        smtpPort: preset.port,
        smtpStartTls: true
      }, { emitEvent: false });
    }
    if (provider === 'GMAIL' || provider === 'OUTLOOK' || provider === 'OFFICE365') {
      const email = this.form.get('email')?.value ?? '';
      if (email && !this.form.get('smtpUsername')?.value) {
        this.form.patchValue({ smtpUsername: email }, { emitEvent: false });
      }
    }
  }

  verifyEmailSetup(): void {
    this.verifyingEmail = true;
    this.companyService.verifyEmail().subscribe({
      next: res => {
        this.verifyingEmail = false;
        this.company = res.data ?? this.company;
        this.snackBar.open('Email setup verified. You can send receipts from the Orders page.', 'Close', { duration: 4000 });
      },
      error: err => {
        this.verifyingEmail = false;
        const serverMsg: string = err.error?.message || '';
        let hint = '';
        // Give actionable hints based on common SMTP error patterns
        if (serverMsg.toLowerCase().includes('authentication') || serverMsg.toLowerCase().includes('535') || serverMsg.toLowerCase().includes('username and password')) {
          hint = ' → Wrong email or password. If 2FA is ON, use an App Password.';
        } else if (serverMsg.toLowerCase().includes('connection') || serverMsg.toLowerCase().includes('timeout') || serverMsg.toLowerCase().includes('connect')) {
          hint = ' → Cannot reach SMTP server. Check host/port settings.';
        } else if (serverMsg.toLowerCase().includes('ssl') || serverMsg.toLowerCase().includes('tls') || serverMsg.toLowerCase().includes('handshake')) {
          hint = ' → TLS/SSL error. Try toggling Start TLS or switching port.';
        } else if (!serverMsg) {
          hint = 'Check email address, app password, host and port settings.';
        }
        const display = serverMsg ? serverMsg + hint : hint;
        this.snackBar.open(display || 'Verification failed. Check your SMTP settings.', 'Close', { duration: 9000 });
      }
    });
  }

  connectMicrosoftFlow(): void {
    const state = Math.random().toString(36).slice(2);
    this.companyService.getMicrosoftAuthUrl(state).subscribe({
      next: res => {
        const url = res.data;
        if (!url) {
          this.snackBar.open('Microsoft OAuth is not configured on the server.', 'Close', { duration: 4000 });
          return;
        }
        const popup = window.open(url, 'ms_login', 'width=520,height=700');
        if (!popup) {
          this.snackBar.open('Popup blocked. Allow popups and try again.', 'Close', { duration: 4000 });
          return;
        }
        const timer = window.setInterval(() => {
          if (popup.closed) {
            window.clearInterval(timer);
            // Fallback: if postMessage was blocked or missed, refresh company state when popup closes.
            // (Primary path is the /auth/microsoft-callback page sending postMessage to the opener.)
            setTimeout(() => this.load(), 300);
          }
        }, 500);
      },
      error: () => {
        this.snackBar.open('Failed to start Microsoft sign-in.', 'Close', { duration: 4000 });
      }
    });
  }

  disconnectMicrosoft(): void {
    this.companyService.disconnectMicrosoft().subscribe({
      next: res => {
        this.company = res.data ?? this.company;
        this.snackBar.open('Microsoft account disconnected.', 'Close', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Failed to disconnect Microsoft account.', 'Close', { duration: 4000 });
      }
    });
  }

}
