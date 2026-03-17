import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { CustomerRequest, CustomerResponse } from '../models/customer.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private url = `${environment.apiUrl}/api/customers`;

  constructor(private http: HttpClient) {}

  getAll(
    search?: string,
    page = 0,
    size = 20,
    filters?: { name?: string; email?: string; phone?: string; createdAt?: string; updatedAt?: string }
  ): Observable<ApiResponse<PageResponse<CustomerResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    if (filters) {
      if (filters.name?.trim()) params = params.set('name', filters.name.trim());
      if (filters.email?.trim()) params = params.set('email', filters.email.trim());
      if (filters.phone?.trim()) params = params.set('phone', filters.phone.trim());
      if (filters.createdAt?.trim()) params = params.set('createdAt', filters.createdAt.trim());
      if (filters.updatedAt?.trim()) params = params.set('updatedAt', filters.updatedAt.trim());
    }
    return this.http.get<ApiResponse<PageResponse<CustomerResponse>>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<CustomerResponse>> {
    return this.http.get<ApiResponse<CustomerResponse>>(`${this.url}/${id}`);
  }

  getByMemberCard(barcode: string): Observable<ApiResponse<CustomerResponse>> {
    return this.http.get<ApiResponse<CustomerResponse>>(`${this.url}/by-card/${encodeURIComponent(barcode)}`);
  }

  createMemberCard(id: number): Observable<ApiResponse<CustomerResponse>> {
    return this.http.post<ApiResponse<CustomerResponse>>(`${this.url}/${id}/member-card`, {});
  }

  create(req: CustomerRequest): Observable<ApiResponse<CustomerResponse>> {
    return this.http.post<ApiResponse<CustomerResponse>>(this.url, req);
  }

  update(id: number, req: CustomerRequest): Observable<ApiResponse<CustomerResponse>> {
    return this.http.put<ApiResponse<CustomerResponse>>(`${this.url}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }

  getStats(): Observable<ApiResponse<{ total: number }>> {
    return this.http.get<ApiResponse<{ total: number }>>(`${this.url}/stats`,
      { headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }) });
  }
}
