export interface CompanyResponse {
  id: number;
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  website?: string;
  receiptFooterText?: string;
  receiptHeaderText?: string;
  receiptPaperSize?: string;
  /** Display currency code for prices and reports (e.g. USD, INR, EUR). */
  displayCurrency?: string;
  /** Locale for number/date formatting (e.g. en-US, hi-IN). */
  locale?: string;
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
}

export interface CompanyRequest {
  name: string;
  logoUrl?: string;
  faviconUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  website?: string;
  receiptFooterText?: string;
  receiptHeaderText?: string;
  receiptPaperSize?: string;
  displayCurrency?: string;
  locale?: string;
  posQuickShiftControls?: boolean;
  posLayout?: string | null;
  shiftMaxDifferenceAbsolute?: number | null;
  shiftMinOpenMinutes?: number | null;
  shiftMaxOpenHours?: number | null;
  shiftRequireSameDay?: boolean | null;
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
