import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { CompanyRequest, CompanyResponse } from '../models/company.models';
import { resolveProductImageUrl } from '../utils/product-image.util';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private url = `${environment.apiUrl}/api/company`;
  private cached: CompanyResponse | null = null;

  constructor(private http: HttpClient) {}

  get(forceRefresh = false): Observable<ApiResponse<CompanyResponse>> {
    const req = this.http.get<ApiResponse<CompanyResponse>>(this.url);
    if (!forceRefresh) {
      return req.pipe(tap(res => { this.applyCached(res.data); }));
    }
    this.cached = null;
    return req.pipe(tap(res => { this.applyCached(res.data); }));
  }

  getCached(): CompanyResponse | null {
    return this.cached;
  }

  private applyCached(data: CompanyResponse | null | undefined): void {
    this.cached = data ?? null;
    if (data?.faviconUrl && typeof document !== 'undefined') {
      const resolved = resolveProductImageUrl(data.faviconUrl);
      if (!resolved) return;

      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;

      // Remove any existing favicon links so browsers actually refresh it
      const oldLinks = head.querySelectorAll('link[rel*="icon"]');
      oldLinks.forEach(l => head.removeChild(l));

      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      // Cache-buster so browsers don't keep the old icon
      link.href = `${resolved}${resolved.includes('?') ? '&' : '?'}v=${Date.now()}`;
      head.appendChild(link);
    }
  }

  update(req: CompanyRequest): Observable<ApiResponse<CompanyResponse>> {
    return this.http.put<ApiResponse<CompanyResponse>>(this.url, req).pipe(
      tap(res => { this.applyCached(res.data); })
    );
  }

  uploadLogo(file: File): Observable<ApiResponse<CompanyResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<CompanyResponse>>(`${this.url}/logo`, form).pipe(
      tap(res => { this.applyCached(res.data); })
    );
  }

  uploadFavicon(file: File): Observable<ApiResponse<CompanyResponse>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<CompanyResponse>>(`${this.url}/favicon`, form).pipe(
      tap(res => { this.applyCached(res.data); })
    );
  }
}
