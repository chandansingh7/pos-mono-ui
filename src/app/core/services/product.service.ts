import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { ProductRequest, ProductResponse } from '../models/product.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  outOfStock: number;
}

export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  updatedCount?: number;
  failCount: number;
  errors: { row: number; field: string; message: string }[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private url = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) {}

  getAll(search?: string, categoryId?: number, page = 0, size = 20, sort?: string): Observable<ApiResponse<PageResponse<ProductResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId);
    if (sort) params = params.set('sort', sort);
    return this.http.get<ApiResponse<PageResponse<ProductResponse>>>(this.url, { params });
  }

  getById(id: number): Observable<ApiResponse<ProductResponse>> {
    return this.http.get<ApiResponse<ProductResponse>>(`${this.url}/${id}`);
  }

  getByBarcode(barcode: string): Observable<ApiResponse<ProductResponse>> {
    return this.http.get<ApiResponse<ProductResponse>>(`${this.url}/barcode/${barcode}`);
  }

  create(req: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.post<ApiResponse<ProductResponse>>(this.url, req);
  }

  update(id: number, req: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.put<ApiResponse<ProductResponse>>(`${this.url}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<ApiResponse<ProductResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<ProductResponse>>(`${this.url}/${id}/image`, form);
  }

  getStats(): Observable<ApiResponse<ProductStats>> {
    // Add a cache-busting param so stats always reflect the latest data.
    const params = new HttpParams().set('_ts', Date.now().toString());
    return this.http.get<ApiResponse<ProductStats>>(`${this.url}/stats`, {
      headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }),
      params
    });
  }

  /** Check which SKUs already exist; returns list of existing SKUs. */
  bulkCheckSkus(skus: string[]): Observable<ApiResponse<string[]>> {
    const list = (skus || []).filter(s => s != null && String(s).trim() !== '');
    return this.http.post<ApiResponse<string[]>>(`${this.url}/bulk-check`, list);
  }

  bulkUpload(file: File): Observable<ApiResponse<BulkUploadResult>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<BulkUploadResult>>(`${this.url}/bulk-upload`, form);
  }

  downloadBulkTemplate(): Observable<Blob> {
    return this.http.get(`${this.url}/bulk-upload-template`, { responseType: 'blob' });
  }

  downloadBulkTemplateCsv(): Observable<Blob> {
    return this.http.get(`${this.url}/bulk-upload-template.csv`, { responseType: 'blob' });
  }
}
