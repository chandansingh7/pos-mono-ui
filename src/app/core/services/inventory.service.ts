import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { InventoryResponse, InventoryUpdateRequest } from '../models/inventory.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

export interface InventoryStats {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private url = `${environment.apiUrl}/api/inventory`;

  constructor(private http: HttpClient) {}

  getAll(search: string | undefined, page = 0, size = 20, sort = 'updatedAt,desc'): Observable<ApiResponse<PageResponse<InventoryResponse>>> {
    let params: Record<string, string> = { page: String(page), size: String(size), sort };
    if (search != null && search.trim() !== '') {
      params = { ...params, search: search.trim() };
    }
    return this.http.get<ApiResponse<PageResponse<InventoryResponse>>>(this.url, { params: params as any });
  }

  getLowStock(silent = false): Observable<ApiResponse<InventoryResponse[]>> {
    const headers = silent ? new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }) : undefined;
    return this.http.get<ApiResponse<InventoryResponse[]>>(`${this.url}/low-stock`, { headers });
  }

  getByProduct(productId: number): Observable<ApiResponse<InventoryResponse>> {
    return this.http.get<ApiResponse<InventoryResponse>>(`${this.url}/product/${productId}`);
  }

  update(productId: number, req: InventoryUpdateRequest): Observable<ApiResponse<InventoryResponse>> {
    return this.http.put<ApiResponse<InventoryResponse>>(`${this.url}/product/${productId}`, req);
  }

  getStats(): Observable<ApiResponse<InventoryStats>> {
    return this.http.get<ApiResponse<InventoryStats>>(`${this.url}/stats`,
      { headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }) });
  }
}
