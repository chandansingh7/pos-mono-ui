import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompanyResponse, RECEIPT_PAPER_SIZES, DISPLAY_CURRENCIES, DISPLAY_LOCALES, POS_LAYOUTS, WEIGHT_UNITS, VOLUME_UNITS } from '../../core/models/company.models';
import { COUNTRIES, getDefaultWeightUnitForCountry, getDefaultVolumeUnitForCountry } from '../../core/data/countries.data';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';
import { LabelPrintTemplate, LabelPrintTemplateId, resolveLabelPrintTemplate } from '../labels/label-print-template.util';

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
  logoLoadError = false;
  faviconLoadError = false;

  labelTemplates: LabelPrintTemplate[] = [
    { id: 'A4_2x4', name: 'A4 — 2×4 (8 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'A4_2x5', name: 'A4 — 2×5 (10 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 5, gapMm: 5, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'A4_3x4', name: 'A4 — 3×4 (12 per page)', pageWidthMm: 210, pageHeightMm: 297, columns: 3, rows: 4, gapMm: 4, pagePaddingMm: 8, labelPaddingMm: 4 },
    { id: 'CUSTOM', name: 'Custom (basic layout)', pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, gapMm: 6, pagePaddingMm: 8, labelPaddingMm: 4 },
  ];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
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
      labelTemplateId: ['A4_2x4'],
      labelTemplateColumns: [2],
      labelTemplateRows: [4],
      labelTemplateGapMm: [6],
      labelTemplatePagePaddingMm: [8],
      labelTemplateLabelPaddingMm: [4]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }
    this.load();
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
            labelTemplateId: this.company.labelTemplateId ?? 'A4_2x4',
            labelTemplateColumns: this.company.labelTemplateColumns ?? 2,
            labelTemplateRows: this.company.labelTemplateRows ?? 4,
            labelTemplateGapMm: this.company.labelTemplateGapMm ?? 6,
            labelTemplatePagePaddingMm: this.company.labelTemplatePagePaddingMm ?? 8,
            labelTemplateLabelPaddingMm: this.company.labelTemplateLabelPaddingMm ?? 4
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
            labelTemplateId: 'A4_2x4',
            labelTemplateColumns: 2,
            labelTemplateRows: 4,
            labelTemplateGapMm: 6,
            labelTemplatePagePaddingMm: 8,
            labelTemplateLabelPaddingMm: 4
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
    const allowed: LabelPrintTemplateId[] = ['A4_2x4', 'A4_2x5', 'A4_3x4', 'CUSTOM'];
    return raw && allowed.includes(raw) ? raw : 'A4_2x4';
  }

  get labelLayoutPreview(): LabelPrintTemplate {
    const tpl = resolveLabelPrintTemplate(this.labelTemplates, this.labelTemplateId, {
      columns: this.form.get('labelTemplateColumns')?.value,
      rows: this.form.get('labelTemplateRows')?.value,
      gapMm: this.form.get('labelTemplateGapMm')?.value,
      pagePaddingMm: this.form.get('labelTemplatePagePaddingMm')?.value,
      labelPaddingMm: this.form.get('labelTemplateLabelPaddingMm')?.value
    });
    return tpl;
  }

  get labelPreviewBoxes(): number[] {
    const tpl = this.labelLayoutPreview;
    const count = Math.max(1, tpl.columns * tpl.rows);
    return Array.from({ length: count }, (_, i) => i);
  }
}
