export interface ProductRequest {
  name: string;
  sku?: string;
  barcode?: string;
  size?: string;
  color?: string;
  price: number;
  saleUnitType?: string;
  saleUnit?: string;
  categoryId?: number;
  imageUrl?: string;
  active: boolean;
  initialStock: number;
  lowStockThreshold: number;
}

export interface ProductResponse {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  size?: string;
  color?: string;
  price: number;
  saleUnitType?: string;
  saleUnit?: string;
  categoryId: number;
  categoryName: string;
  imageUrl: string;
  active: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

/** How a product is sold: by piece, by weight (mass), or by volume (liquid). */
export const SALE_UNIT_TYPES = [
  { value: 'PIECE', label: 'Piece / Each' },
  { value: 'WEIGHT', label: 'Weight (mass)' },
  { value: 'VOLUME', label: 'Volume (liquid)' }
] as const;

/** Units per type: piece → each; weight → kg, g, lb, oz; volume → L, ml, gal, fl_oz. */
export const SALE_UNITS: Record<string, { value: string; label: string }[]> = {
  PIECE: [{ value: 'each', label: 'Each (piece)' }],
  WEIGHT: [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'lb', label: 'Pound (lb)' },
    { value: 'oz', label: 'Ounce (oz)' }
  ],
  VOLUME: [
    { value: 'L', label: 'Liter (L)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'gal', label: 'US Gallon (gal)' },
    { value: 'fl_oz', label: 'US Fluid ounce (fl oz)' }
  ]
};

/** Human-readable unit label for display (e.g. on receipts). */
export function getUnitLabel(unit: string | null | undefined): string {
  if (!unit) return 'each';
  const u = unit.toLowerCase();
  const map: Record<string, string> = { each: 'each', kg: 'kg', g: 'g', lb: 'lb', oz: 'oz', l: 'L', ml: 'ml', gal: 'gal', fl_oz: 'fl oz' };
  return map[u] ?? unit;
}
