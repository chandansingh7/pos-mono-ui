import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class BlockedIpService {
  private readonly url = `${environment.apiUrl}/api/users/blocked-ips`;

  constructor(private http: HttpClient) {}

  getBlockedIps(username: string): Observable<ApiResponse<string[]>> {
    const params = new HttpParams().set('username', username);
    return this.http.get<ApiResponse<string[]>>(this.url, { params });
  }

  addBlockedIp(username: string, ipAddress: string): Observable<ApiResponse<string[]>> {
    return this.http.post<ApiResponse<string[]>>(this.url, { username, ipAddress });
  }

  removeBlockedIp(username: string, ipAddress: string): Observable<ApiResponse<string[]>> {
    const params = new HttpParams().set('username', username).set('ipAddress', ipAddress);
    return this.http.delete<ApiResponse<string[]>>(this.url, { params });
  }
}
