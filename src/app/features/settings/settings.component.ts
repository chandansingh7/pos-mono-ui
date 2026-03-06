import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../../core/services/company.service';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CompanyResponse, RECEIPT_PAPER_SIZES, DISPLAY_CURRENCIES, DISPLAY_LOCALES, POS_LAYOUTS } from '../../core/models/company.models';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';

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
  logoLoadError = false;
  faviconLoadError = false;

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
      posQuickShiftControls: [false],
      shiftMaxDifferenceAbsolute: [null],
      shiftMinOpenMinutes: [null],
      shiftMaxOpenHours: [null],
      shiftRequireSameDay: [false],
      posLayout: ['grid']
    });
  }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/app/dashboard']);
      return;
    }
    this.load();
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
            posQuickShiftControls: this.company.posQuickShiftControls ?? false,
            shiftMaxDifferenceAbsolute: this.company.shiftMaxDifferenceAbsolute ?? null,
            shiftMinOpenMinutes: this.company.shiftMinOpenMinutes ?? null,
            shiftMaxOpenHours: this.company.shiftMaxOpenHours ?? null,
            shiftRequireSameDay: this.company.shiftRequireSameDay ?? false,
            posLayout: this.company.posLayout ?? 'grid'
          });
        } else {
          this.form.patchValue({
            name: 'My Store',
            receiptPaperSize: '80mm',
            displayCurrency: 'USD',
            locale: 'en-US',
            posQuickShiftControls: false,
            shiftMaxDifferenceAbsolute: null,
            shiftMinOpenMinutes: null,
            shiftMaxOpenHours: null,
            shiftRequireSameDay: false,
            posLayout: 'grid'
          });
        }
      },
      error: () => { this.loading = false; }
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const payload = {
      ...this.form.value,
      logoUrl: this.company?.logoUrl,
      faviconUrl: this.company?.faviconUrl
    };
    this.companyService.update(payload).subscribe({
      next: () => {
        this.saving = false;
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
}
