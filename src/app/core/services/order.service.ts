import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { OrderRequest, OrderResponse } from '../models/order.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

export interface OrderStats {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  refunded: number;
  totalRevenue: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private url = `${environment.apiUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  getAll(
    page = 0,
    size = 20,
    filters?: { id?: string; customer?: string; cashier?: string; items?: string; total?: string; status?: string; payment?: string; date?: string }
  ): Observable<ApiResponse<PageResponse<OrderResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters) {
      if (filters.id?.trim()) params = params.set('id', filters.id.trim());
      if (filters.customer?.trim()) params = params.set('customer', filters.customer.trim());
      if (filters.cashier?.trim()) params = params.set('cashier', filters.cashier.trim());
      if (filters.items?.trim()) params = params.set('items', filters.items.trim());
      if (filters.total?.trim()) params = params.set('total', filters.total.trim());
      if (filters.status?.trim()) params = params.set('status', filters.status.trim());
      if (filters.payment?.trim()) params = params.set('paymentMethod', filters.payment.trim());
      if (filters.date?.trim()) params = params.set('date', filters.date.trim());
    }
    return this.http.get<ApiResponse<PageResponse<OrderResponse>>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.get<ApiResponse<OrderResponse>>(`${this.url}/${id}`);
  }

  create(req: OrderRequest): Observable<ApiResponse<OrderResponse>> {
    return this.http.post<ApiResponse<OrderResponse>>(this.url, req);
  }

  cancel(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.put<ApiResponse<OrderResponse>>(`${this.url}/${id}/cancel`, {});
  }

  /** Send receipt email from company email (Settings) to customer. Requires SMTP configured and company email set. */
  sendReceipt(orderId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.url}/${orderId}/send-receipt`, {});
  }

  getStats(): Observable<ApiResponse<OrderStats>> {
    return this.http.get<ApiResponse<OrderStats>>(`${this.url}/stats`,
      { headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }) });
  }
}
