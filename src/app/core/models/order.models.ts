export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MOBILE_PAYMENT';
export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface OrderRequest {
  customerId?: number;
  items: OrderItemRequest[];
  paymentMethod: PaymentMethod;
  discount: number;
  pointsToRedeem?: number;
}

export interface OrderItemResponse {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  refundedQuantity?: number;
}

export interface RefundItemResponse {
  orderItemId: number;
  productName: string;
  quantity: number;
  amount: number;
}

export interface RefundResponse {
  id: number;
  orderId: number;
  refundedBy: string;
  refundedAt: string;
  amount: number;
  refundMethod: PaymentMethod;
  reason?: string | null;
  rewardPointsDeducted?: number | null;
  items?: RefundItemResponse[];
}

export interface RefundItemRequest {
  orderItemId: number;
  quantity: number;
}

export interface RefundRequest {
  reason?: string;
  items?: RefundItemRequest[];
}

export interface OrderResponse {
  id: number;
  customerId: number;
  customerName: string;
  customerEmail?: string | null;
  cashierUsername: string;
  items: OrderItemResponse[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  refundedAmount?: number;
  refunds?: RefundResponse[];
  refund?: RefundResponse | null;  // backward compat
}
