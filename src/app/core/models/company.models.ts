export interface CompanyResponse {
  id: number;
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  smtpProvider?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpStartTls?: boolean;
  emailVerifiedAt?: string | null;
  emailSendMethod?: string;
  msAccountEmail?: string;
  msConnectedAt?: string | null;
  taxId?: string;
  website?: string;
  receiptFooterText?: string;
  receiptHeaderText?: string;
  receiptPaperSize?: string;
  /** Display currency code for prices and reports (e.g. USD, INR, EUR). */
  displayCurrency?: string;
  /** Locale for number/date formatting (e.g. en-US, hi-IN). */
  locale?: string;
  /** ISO 3166-1 alpha-2 country code (e.g. US, IN). Used to pre-select weight unit. */
  countryCode?: string;
  /** Weight unit for products: kg or lb. */
  weightUnit?: string;
  /** Volume unit for products: L or gal. */
  volumeUnit?: string;
  updatedAt?: string;
  /** Whether quick shift open/close controls are enabled on POS / Cashier. */
  posQuickShiftControls?: boolean;
  /** POS layout: 'grid' (product grid) or 'scan' (list + search/key-in; barcode adds to cart). */
  posLayout?: string;
  /** Shift rule: max allowed cash difference when closing a shift. */
  shiftMaxDifferenceAbsolute?: number;
  /** Shift rule: minimum open minutes before close is allowed. */
  shiftMinOpenMinutes?: number;
  /** Shift rule: maximum open hours before close is blocked. */
  shiftMaxOpenHours?: number;
  /** Shift rule: require same-day close. */
  shiftRequireSameDay?: boolean;

  /** Label field visibility defaults for printed labels. */
  labelShowName?: boolean;
  labelShowSku?: boolean;
  labelShowPrice?: boolean;

  /** Default label layout template for price labels (A4_2x4, A4_2x5, A4_3x4, CUSTOM). */
  labelTemplateId?: string;
  /** Custom layout: columns for CUSTOM template. */
  labelTemplateColumns?: number;
  /** Custom layout: rows for CUSTOM template. */
  labelTemplateRows?: number;
  /** Custom layout: gap (mm) between labels for CUSTOM template. */
  labelTemplateGapMm?: number;
  /** Custom layout: page padding (mm) for CUSTOM template. */
  labelTemplatePagePaddingMm?: number;
  /** Custom layout: label padding (mm) for CUSTOM template. */
  labelTemplateLabelPaddingMm?: number;

  /** Optional custom page width (mm) for CUSTOM label template. */
  labelPageWidthMm?: number;

  /** Optional custom page height (mm) for CUSTOM label template. */
  labelPageHeightMm?: number;
}

export interface CompanyRequest {
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  smtpProvider?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  /** Only sent when saving; never returned. Use app password if you have 2FA. */
  smtpPassword?: string | null;
  smtpStartTls?: boolean | null;
  emailSendMethod?: string | null;
  taxId?: string;
  website?: string;
  receiptFooterText?: string;
  receiptHeaderText?: string;
  receiptPaperSize?: string;
  displayCurrency?: string;
  locale?: string;
  countryCode?: string | null;
  weightUnit?: string | null;
  volumeUnit?: string | null;
  posQuickShiftControls?: boolean;
  posLayout?: string | null;
  shiftMaxDifferenceAbsolute?: number | null;
  shiftMinOpenMinutes?: number | null;
  shiftMaxOpenHours?: number | null;
  shiftRequireSameDay?: boolean | null;

  /** Label field visibility defaults for printed labels. */
  labelShowName?: boolean | null;
  labelShowSku?: boolean | null;
  labelShowPrice?: boolean | null;

  /** Default label layout template for price labels (A4_2x4, A4_2x5, A4_3x4, CUSTOM). */
  labelTemplateId?: string | null;
  /** Custom layout: columns for CUSTOM template. */
  labelTemplateColumns?: number | null;
  /** Custom layout: rows for CUSTOM template. */
  labelTemplateRows?: number | null;
  /** Custom layout: gap (mm) between labels for CUSTOM template. */
  labelTemplateGapMm?: number | null;
  /** Custom layout: page padding (mm) for CUSTOM template. */
  labelTemplatePagePaddingMm?: number | null;
  /** Custom layout: label padding (mm) for CUSTOM template. */
  labelTemplateLabelPaddingMm?: number | null;

  /** Optional custom page width (mm) for CUSTOM label template. */
  labelPageWidthMm?: number | null;

  /** Optional custom page height (mm) for CUSTOM label template. */
  labelPageHeightMm?: number | null;
}

/** POS layout options for Settings and POS component. */
export const POS_LAYOUTS = [
  { value: 'grid', label: 'Product grid', description: 'Product grid with separate search and barcode fields' },
  { value: 'scan', label: 'Search / scan', description: 'Product list at top, single "Search or key in item" field; barcode adds directly to cart' }
] as const;

export const RECEIPT_PAPER_SIZES = [
  { value: '58mm', label: '58 mm (thermal)' },
  { value: '80mm', label: '80 mm (thermal)' },
  { value: 'A4', label: 'A4' }
] as const;

/** Common display currencies for company settings. */
export const DISPLAY_CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'MXN', label: 'MXN - Mexican Peso' }
] as const;

/** Weight unit options for products and receipts (by country). */
export const WEIGHT_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lb', label: 'Pounds (lb)' }
] as const;

/** Volume unit options for products (liquid). */
export const VOLUME_UNITS = [
  { value: 'L', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'gal', label: 'US Gallon (gal)' },
  { value: 'fl_oz', label: 'US Fluid ounce (fl oz)' }
] as const;

/** Email (SMTP) provider presets for receipt sending. Host/port are pre-filled for Gmail and Outlook. */
export const EMAIL_PROVIDERS = [
  { value: 'GMAIL', label: 'Gmail', hint: 'Use App Password if you have 2-step verification', host: 'smtp.gmail.com', port: 587 },
  { value: 'OUTLOOK', label: 'Microsoft Outlook / Office 365', hint: 'Use App password if you have 2FA', host: 'smtp.office365.com', port: 587 },
  { value: 'CUSTOM', label: 'Custom SMTP', hint: 'Enter your server host and port', host: '', port: 587 }
] as const;

/** Common locales for number/date formatting. */
export const DISPLAY_LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese (Japan)' }
] as const;
