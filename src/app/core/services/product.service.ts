import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
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
    // Add cache-busting param so refreshed list after bulk upload always shows latest data.
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('_ts', Date.now().toString());
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

  /**
   * Bulk upload with optional progress callback (0–100 percent).
   * Progress reflects upload of the file to the server, not server-side processing.
   */
  bulkUpload(file: File, onProgress?: (percent: number) => void): Observable<ApiResponse<BulkUploadResult>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<BulkUploadResult>>(`${this.url}/bulk-upload`, form, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      tap(event => {
        if (event.type === HttpEventType.UploadProgress && event.total && event.total > 0 && onProgress) {
          onProgress(Math.round((100 * event.loaded) / event.total));
        }
      }),
      filter((event): event is HttpResponse<ApiResponse<BulkUploadResult>> => event.type === HttpEventType.Response),
      map(event => event.body!)
    );
  }

  downloadBulkTemplate(): Observable<Blob> {
    return this.http.get(`${this.url}/bulk-upload-template`, { responseType: 'blob' });
  }

  downloadBulkTemplateCsv(): Observable<Blob> {
    return this.http.get(`${this.url}/bulk-upload-template.csv`, { responseType: 'blob' });
  }
}
