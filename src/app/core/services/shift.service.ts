import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { CloseShiftRequest, OpenShiftRequest, ShiftListResponse, ShiftResponse } from '../models/shift.models';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly url = `${environment.apiUrl}/api/shifts`;

  constructor(private http: HttpClient) {}

  open(request: OpenShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/open`, request);
  }

  getCurrent(): Observable<ApiResponse<ShiftResponse>> {
    return this.http.get<ApiResponse<ShiftResponse>>(`${this.url}/current`);
  }

  close(request: CloseShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/close`, request);
  }

  list(page = 0, size = 20): Observable<ApiResponse<ShiftListResponse>> {
    return this.http.get<ApiResponse<ShiftListResponse>>(this.url, {
      params: { page: String(page), size: String(size) }
    });
  }
}

