import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';

export interface RewardConfigResponse {
  pointsPerDollar: number;
  redemptionRate: number;
}

@Injectable({ providedIn: 'root' })
export class RewardService {
  private url = `${environment.apiUrl}/api/rewards`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<ApiResponse<RewardConfigResponse>> {
    return this.http.get<ApiResponse<RewardConfigResponse>>(`${this.url}/config`);
  }
}
