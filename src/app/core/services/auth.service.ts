import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { AuthResponse, LoginRequest, RegisterRequest, Role } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'pos_token';
  private readonly USER_KEY = 'pos_user';

  constructor(private http: HttpClient) {}

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${environment.apiUrl}/api/auth/login`,
      request
    ).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem(this.TOKEN_KEY, res.data.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${environment.apiUrl}/api/auth/register`,
      request
    );
  }

  changePassword(request: { currentPassword: string; newPassword: string; confirmPassword: string }): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${environment.apiUrl}/api/users/me/password`,
      request
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): AuthResponse | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getRole(): Role | null {
    return this.getCurrentUser()?.role ?? null;
  }

  getUsername(): string | null {
    return this.getCurrentUser()?.username ?? null;
  }

  /** Resolved client IP for the current request (e.g. to avoid blocking own IP in Access Logs). */
  getClientIp(): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${environment.apiUrl}/api/auth/client-ip`);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  isAdminOrManager(): boolean {
    const role = this.getRole();
    return role === 'ADMIN' || role === 'MANAGER';
  }
}
