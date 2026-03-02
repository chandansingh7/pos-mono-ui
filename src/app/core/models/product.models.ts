export interface ProductRequest {
  name: string;
  sku?: string;
  barcode?: string;
  size?: string;
  color?: string;
  price: number;
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
  categoryId: number;
  categoryName: string;
  imageUrl: string;
  active: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
