import { Injectable } from '@angular/core';
import {
  HttpRequest, HttpHandler, HttpEvent,
  HttpInterceptor, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';

/**
 * Requests tagged with this header are "silent" — errors are passed through
 * to the caller but NOT shown in the global snackbar. Use for background /
 * supplementary fetches (e.g. stats, optional data) where failure is acceptable.
 */
export const SILENT_ERROR_HEADER = 'X-Silent-Error';

/** HTTP status codes that all indicate the server is unreachable / unavailable. */
const SERVER_DOWN_STATUSES = new Set([0, 502, 503, 504]);

const ERROR_MAP: Record<number, { code: string; message: string }> = {
  0:   { code: 'NW001', message: 'Cannot reach the server. Please check your connection and try again.' },
  401: { code: 'AU003', message: 'Your session has expired. Please log in again.' },
  403: { code: 'AU004', message: 'You do not have permission to perform this action.' },
  404: { code: 'GN001', message: 'The requested resource was not found.' },
  408: { code: 'NW002', message: 'Request timed out. Please check your connection.' },
  429: { code: 'NW003', message: 'Too many requests. Please slow down and try again.' },
  500: { code: 'SV001', message: 'An unexpected server error occurred. Please try again.' },
  502: { code: 'NW001', message: 'Cannot reach the server. Please try again in a moment.' },
  503: { code: 'NW001', message: 'Service is temporarily unavailable. Please try again in a moment.' },
  504: { code: 'NW001', message: 'The server took too long to respond. Please try again.' },
};

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const silent = request.headers.has(SILENT_ERROR_HEADER);

    // Strip the sentinel header before sending to the server
    const outgoing = silent
      ? request.clone({ headers: request.headers.delete(SILENT_ERROR_HEADER) })
      : request;

    return next.handle(outgoing).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
          if (!silent) {
            this.showError(ERROR_MAP[401].code, ERROR_MAP[401].message, 3000);
          }
        } else if (error.status === 403 && error.error?.errorCode === 'AU008') {
          // IP not allowed / blocked — end session and redirect to login
          this.authService.logout();
          this.router.navigate(['/login']);
          if (!silent) {
            const { code, message } = this.resolveError(error);
            this.showError(code, message, 5000);
          }
        } else if (!silent) {
          const { code, message } = this.resolveError(error);
          this.showError(code, message, SERVER_DOWN_STATUSES.has(error.status) ? 6000 : 5000);
        }

        return throwError(() => error);
      })
    );
  }

  private resolveError(error: HttpErrorResponse): { code: string; message: string } {
    // No response at all → browser could not reach the server
    if (error.status === 0) {
      return ERROR_MAP[0];
    }

    // Prefer structured error body from the backend
    const body = error.error;
    if (body?.errorCode && body?.message) {
      return { code: body.errorCode as string, message: body.message as string };
    }

    return ERROR_MAP[error.status] ?? { code: 'SV001', message: 'An unexpected error occurred.' };
  }

  private showError(code: string, message: string, duration: number): void {
    this.snackBar.open(`[${code}] ${message}`, 'Close', {
      duration,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
