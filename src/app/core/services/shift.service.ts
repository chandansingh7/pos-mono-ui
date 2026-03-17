import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { CloseShiftRequest, OpenShiftRequest, ShiftListResponse, ShiftResponse } from '../models/shift.models';
import { SILENT_ERROR_HEADER } from '../interceptors/error.interceptor';
import { NetworkStatusService } from './network-status.service';
import { PosLocalStoreService, LocalShift } from './pos-local-store.service';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly url = `${environment.apiUrl}/api/shifts`;
  private _isOffline = false;

  constructor(
    private http: HttpClient,
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService
  ) {
    this.networkStatus.isOffline$.subscribe(off => { this._isOffline = off; });
  }

  /**
   * Open a shift.
   * - Online: calls API as before.
   * - Offline: saves a LocalShift to IndexedDB (pending sync) and returns
   *   a synthetic ShiftResponse so the POS can continue working.
   */
  open(request: OpenShiftRequest): Observable<ApiResponse<ShiftResponse>> {
    if (this._isOffline) {
      return from(this.openOffline(request));
    }
    return this.http.post<ApiResponse<ShiftResponse>>(`${this.url}/open`, request);
  }

  private async openOffline(request: OpenShiftRequest): Promise<ApiResponse<ShiftResponse>> {
    await this.localStore.init();
    const existingOpen = await this.localStore.getOpenLocalShift();
    if (existingOpen) {
      throw { error: { message: 'You already have an open offline shift.' } };
    }
    const localId = 'shift_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const openedAt = new Date().toISOString();
    const deviceId = this.localStore.getDeviceId();
    const localShift: LocalShift = {
      localId,
      openingFloat: request.openingFloat,
      openedAt,
      deviceId,
      syncStatus: 'pending'
    };
    await this.localStore.saveLocalShift(localShift);
    // Return a synthetic ShiftResponse so the UI can proceed normally
    const synthetic: ShiftResponse = {
      id: 0,
      cashierUsername: 'offline',
      openingFloat: request.openingFloat,
      cashSales: 0,
      expectedCash: request.openingFloat,
      countedCash: 0,
      difference: 0,
      status: 'OPEN',
      openedAt: openedAt
    };
    return { success: true, message: 'Shift opened offline — will sync when online.', data: synthetic, errorCode: null };
  }

  /**
   * Get the current open shift.
   * - Online: calls API.
   * - Offline: checks IndexedDB for a local pending shift; returns it if found.
   */
  getCurrent(): Observable<ApiResponse<ShiftResponse>> {
    if (this._isOffline) {
      return from(this.getCurrentOffline());
    }
    return this.http.get<ApiResponse<ShiftResponse>>(`${this.url}/current`, {
      headers: new HttpHeaders({ [SILENT_ERROR_HEADER]: '1' })
    });
  }

  private async getCurrentOffline(): Promise<ApiResponse<ShiftResponse>> {
    await this.localStore.init();
    const localShift = await this.localStore.getOpenLocalShift();
    if (!localShift) {
      // Mimic the server 404/OR001 shape so the Shifts component handles it gracefully
      throw { status: 404, error: { errorCode: 'OR001', message: 'No open shift' } };
    }
    const synthetic: ShiftResponse = {
      id: 0,
      cashierUsername: 'offline',
      openingFloat: localShift.openingFloat,
      cashSales: 0,
      expectedCash: localShift.openingFloat,
      countedCash: 0,
      difference: 0,
      status: 'OPEN',
      openedAt: localShift.openedAt
    };
    return { success: true, message: null as any, data: synthetic, errorCode: null };
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
