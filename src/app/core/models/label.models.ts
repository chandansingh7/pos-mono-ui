export interface LabelRequest {
  barcode: string;
  name: string;
  price: number;
  sku?: string;
  categoryId?: number;
}

export interface LabelResponse {
  id: number;
  barcode: string;
  name: string;
  price: number;
  sku: string | null;
  categoryId: number | null;
  categoryName: string | null;
  productId: number | null;
  createdAt: string;
}
