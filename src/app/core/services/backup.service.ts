import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly base = `${environment.apiUrl}/api/backup`;

  constructor(private http: HttpClient) {}

  /** Check if SQL backup is available (PostgreSQL + pg_dump). */
  isSqlAvailable(): Observable<ApiResponse<boolean>> {
    return this.http.get<ApiResponse<boolean>>(`${this.base}/sql-available`);
  }

  /** Download JSON backup as a file. */
  exportJson(): Observable<Blob> {
    return this.http.get(`${this.base}/export/json`, { responseType: 'blob' });
  }

  /** Download SQL backup as a file. */
  exportSql(): Observable<Blob> {
    return this.http.get(`${this.base}/export/sql`, { responseType: 'blob' });
  }

  /** Restore from backup file. Format must be 'json' or 'sql'. */
  restore(file: File, format: 'json' | 'sql'): Observable<ApiResponse<string>> {
    const form = new FormData();
    form.append('file', file);
    form.append('format', format);
    return this.http.post<ApiResponse<string>>(`${this.base}/restore`, form);
  }
}
