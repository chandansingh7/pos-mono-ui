import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { CloseShiftRequest, OpenShiftRequest, ShiftListResponse, ShiftResponse } from '../models/shift.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly url = `${environment.apiUrl}/api/shifts`;

  constructor(private http: HttpClient) {}

  open(request: OpenShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/open`, request);
  }

  getCurrent(): Observable<ApiResponse<ShiftResponse>> {
    // Silent because "no open shift" is handled gracefully by the Shifts component
    return this.http.get<ApiResponse<ShiftResponse>>(`${this.url}/current`, {
      headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' })
    });
  }

  close(request: CloseShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/close`, request);
  }

  forceClose(id: number, request: CloseShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/${id}/force-close`, request);
  }

  list(page = 0, size = 20): Observable<ApiResponse<ShiftListResponse>> {
    return this.http.get<ApiResponse<ShiftListResponse>>(this.url, {
      params: { page: String(page), size: String(size) }
    });
  }
}

