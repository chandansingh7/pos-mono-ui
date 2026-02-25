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
  updatedAt?: string;
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
}

export const RECEIPT_PAPER_SIZES = [
  { value: '58mm', label: '58 mm (thermal)' },
  { value: '80mm', label: '80 mm (thermal)' },
  { value: 'A4', label: 'A4' }
] as const;
