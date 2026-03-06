import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { AccessLogResponse, AccessLogSummaryResponse, UserIpUsageResponse } from '../models/access-log.models';

@Injectable({ providedIn: 'root' })
export class AccessLogService {
  private url = `${environment.apiUrl}/api/access-logs`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 20, username?: string): Observable<ApiResponse<PageResponse<AccessLogResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (username && username.trim()) {
      params = params.set('username', username.trim());
    }
    return this.http.get<ApiResponse<PageResponse<AccessLogResponse>>>(this.url, { params });
  }

  getSummary(page = 0, size = 20, username?: string): Observable<ApiResponse<PageResponse<AccessLogSummaryResponse>>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (username && username.trim()) {
      params = params.set('username', username.trim());
    }
    return this.http.get<ApiResponse<PageResponse<AccessLogSummaryResponse>>>(`${this.url}/summary`, { params });
  }

  getUserIps(username: string): Observable<ApiResponse<UserIpUsageResponse[]>> {
    const params = new HttpParams().set('username', username);
    return this.http.get<ApiResponse<UserIpUsageResponse[]>>(`${this.url}/ips`, { params });
  }
}

