import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { Role } from '../models/auth.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';

export interface UserResponse {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  deliveryAddress: string | null;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface UpdateProfileRequest {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  deliveryAddress: string | null;
}

export interface UserStats {
  total: number;
  admins: number;
  managers: number;
  cashiers: number;
  active: number;
  inactive: number;
}

export interface AdminUpdateUserRequest {
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  deliveryAddress: string | null;
  role: Role;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/api/users`;

  constructor(private http: HttpClient) {}

  getAll(page = 0, size = 10, sort = 'createdAt,desc'): Observable<ApiResponse<PageResponse<UserResponse>>> {
    const params = { page: String(page), size: String(size), sort };
    return this.http.get<ApiResponse<PageResponse<UserResponse>>>(this.base, { params: params as any });
  }

  getMe(): Observable<ApiResponse<UserResponse>> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.base}/me`);
  }

  updateMe(request: UpdateProfileRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.put<ApiResponse<UserResponse>>(`${this.base}/me`, request);
  }

  adminUpdate(id: number, request: AdminUpdateUserRequest): Observable<ApiResponse<UserResponse>> {
    return this.http.put<ApiResponse<UserResponse>>(`${this.base}/${id}`, request);
  }

  toggleActive(id: number): Observable<ApiResponse<UserResponse>> {
    return this.http.patch<ApiResponse<UserResponse>>(`${this.base}/${id}/toggle-active`, {});
  }

  getStats(): Observable<ApiResponse<UserStats>> {
    return this.http.get<ApiResponse<UserStats>>(`${this.base}/stats`,
      { headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' }) });
  }
}
