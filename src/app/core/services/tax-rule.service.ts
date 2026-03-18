import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { TaxRuleRequest, TaxRuleResponse } from '../models/tax-rule.models';

@Injectable({ providedIn: 'root' })
export class TaxRuleService {
  private url = `${environment.apiUrl}/api/tax-rules`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<TaxRuleResponse[]>> {
    return this.http.get<ApiResponse<TaxRuleResponse[]>>(this.url);
  }

  getById(id: number): Observable<ApiResponse<TaxRuleResponse>> {
    return this.http.get<ApiResponse<TaxRuleResponse>>(`${this.url}/${id}`);
  }

  create(req: TaxRuleRequest): Observable<ApiResponse<TaxRuleResponse>> {
    return this.http.post<ApiResponse<TaxRuleResponse>>(this.url, req);
  }

  update(id: number, req: TaxRuleRequest): Observable<ApiResponse<TaxRuleResponse>> {
    return this.http.put<ApiResponse<TaxRuleResponse>>(`${this.url}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.url}/${id}`);
  }
}
