import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { LabelRequest, LabelResponse } from '../models/label.models';
import { ProductResponse } from '../models/product.models';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private url = `${environment.apiUrl}/api/labels`;

  constructor(private http: HttpClient) {}

  getAll(
    search?: string,
    categoryId?: number,
    page = 0,
    size = 20,
    sort = 'createdAt,desc'
  ): Observable<ApiResponse<PageResponse<LabelResponse>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId);
    return this.http.get<ApiResponse<PageResponse<LabelResponse>>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<LabelResponse>> {
    return this.http.get<ApiResponse<LabelResponse>>(`${this.url}/${id}`);
  }

  create(req: LabelRequest): Observable<ApiResponse<LabelResponse>> {
    return this.http.post<ApiResponse<LabelResponse>>(this.url, req);
  }

  createBulk(requests: LabelRequest[]): Observable<ApiResponse<LabelResponse[]>> {
    return this.http.post<ApiResponse<LabelResponse[]>>(`${this.url}/bulk`, requests);
  }

  update(id: number, req: LabelRequest): Observable<ApiResponse<LabelResponse>> {
    return this.http.put<ApiResponse<LabelResponse>>(`${this.url}/${id}`, req);
  }

  addAsProduct(id: number, initialStock = 0): Observable<ApiResponse<ProductResponse>> {
    return this.http.post<ApiResponse<ProductResponse>>(
      `${this.url}/${id}/add-as-product`,
      null,
      { params: { initialStock: String(initialStock) } }
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
