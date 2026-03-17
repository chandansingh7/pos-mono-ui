import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, merge, timer } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { NetworkStatusService } from './network-status.service';
import { PosLocalStoreService, LocalOrder } from './pos-local-store.service';

export interface OfflineOrderSyncItemRequest {
  productId: number;
  quantity: number;
}

export interface OfflineOrderSyncRequest {
  localId: string;
  deviceId: string;
  items: OfflineOrderSyncItemRequest[];
  paymentMethod: string;
  discount: number;
  customerId?: number;
  pointsToRedeem?: number;
}

export interface OfflineOrderSyncResult {
  localId: string;
  serverOrderId?: number;
  status: 'ok' | 'rejected';
  reason?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly url = `${environment.apiUrl}/api/offline-orders/sync`;
  private syncTrigger$ = new Subject<void>();
  private isSyncing = false;

  constructor(
    private http: HttpClient,
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService
  ) {}

  /** Call when app comes online to trigger sync. */
  triggerSync(): void {
    this.syncTrigger$.next();
  }

  /** Start listening: when online, sync pending orders periodically and on trigger. */
  startSyncLoop(): void {
    merge(
      this.syncTrigger$,
      this.networkStatus.isOffline$.pipe(
        filter(offline => !offline),
        switchMap(() => timer(1000))
      )
    ).pipe(
      filter(() => !this.isSyncing),
      switchMap(() => this.syncPendingOrders())
    ).subscribe();
  }

  /** Sync all pending orders to the server. Returns observable of results. */
  syncPendingOrders(): Observable<OfflineOrderSyncResult[]> {
    return new Observable(subscriber => {
      this.isSyncing = true;
      this.localStore.getPendingOrders().then(orders => {
        if (orders.length === 0) {
          this.isSyncing = false;
          subscriber.next([]);
          subscriber.complete();
          return;
        }
        const batch = orders.map(o => this.toSyncRequest(o));
        this.http.post<ApiResponse<OfflineOrderSyncResult[]>>(this.url, { orders: batch }).subscribe({
          next: async res => {
            const results = res.data ?? [];
            for (const r of results) {
              if (r.status === 'ok' && r.serverOrderId != null) {
                await this.localStore.markOrderSynced(r.localId, r.serverOrderId);
              } else if (r.status === 'rejected') {
                await this.localStore.markOrderFailed(r.localId, r.reason ?? 'Unknown error');
              }
            }
            this.isSyncing = false;
            subscriber.next(results);
            subscriber.complete();
          },
          error: async err => {
            const msg = err.error?.message ?? err.message ?? 'Sync failed';
            for (const o of orders) {
              await this.localStore.markOrderFailed(o.localId, msg);
            }
            this.isSyncing = false;
            subscriber.next([]);
            subscriber.complete();
          }
        });
      });
    });
  }

  private toSyncRequest(order: LocalOrder): OfflineOrderSyncRequest {
    const pm = order.paymentMethod || 'CASH';
    return {
      localId: order.localId,
      deviceId: order.deviceId,
      items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: pm,
      discount: order.discount ?? 0,
      customerId: order.customerId,
      pointsToRedeem: order.pointsToRedeem
    };
  }
}
