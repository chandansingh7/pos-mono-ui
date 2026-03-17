import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, merge, timer } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api.models';
import { NetworkStatusService } from './network-status.service';
import { PosLocalStoreService, LocalOrder, LocalShift } from './pos-local-store.service';

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

/**
 * Multi-tab sync coordination via BroadcastChannel.
 * Only one tab runs the sync loop at a time. Tabs elect a "leader" by
 * competing to acquire a lightweight lock message.
 */
const SYNC_CHANNEL = 'pos_sync_leader_v1';
const SYNC_LOCK_MSG = 'acquire';
const SYNC_RELEASE_MSG = 'release';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly ordersUrl = `${environment.apiUrl}/api/offline-orders/sync`;
  private readonly shiftsUrl = `${environment.apiUrl}/api/shifts/open`;
  private syncTrigger$ = new Subject<void>();
  private isSyncing = false;

  /** True when this tab is the elected sync leader. */
  private isLeader = false;
  private channel: BroadcastChannel | null = null;

  constructor(
    private http: HttpClient,
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService
  ) {
    this.initLeaderElection();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Multi-tab coordination (Phase 4)
  // ─────────────────────────────────────────────────────────────────────────────

  private initLeaderElection(): void {
    if (typeof BroadcastChannel === 'undefined') {
      // Fallback: this tab is always the leader if BroadcastChannel unavailable
      this.isLeader = true;
      return;
    }
    this.channel = new BroadcastChannel(SYNC_CHANNEL);
    this.channel.onmessage = (e: MessageEvent<string>) => {
      if (e.data === SYNC_LOCK_MSG && this.isLeader) {
        // Another tab is trying to acquire – we already hold it; ignore
      } else if (e.data === SYNC_RELEASE_MSG) {
        // Previous leader released; this tab can try to take over
        this.tryAcquireLeadership();
      }
    };
    // Try to become leader on init
    this.tryAcquireLeadership();

    // When tab is hidden/closed, release leadership so another tab can take over
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.releaseLeadership();
      } else {
        this.tryAcquireLeadership();
      }
    });
    window.addEventListener('beforeunload', () => this.releaseLeadership());
  }

  private tryAcquireLeadership(): void {
    this.isLeader = true;
    this.channel?.postMessage(SYNC_LOCK_MSG);
  }

  private releaseLeadership(): void {
    if (this.isLeader) {
      this.isLeader = false;
      this.channel?.postMessage(SYNC_RELEASE_MSG);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  /** Manually trigger a sync (called when app comes back online). */
  triggerSync(): void {
    this.syncTrigger$.next();
  }

  /** Start listening: when online (and leader), sync pending orders + shifts. */
  startSyncLoop(): void {
    merge(
      this.syncTrigger$,
      this.networkStatus.isOffline$.pipe(
        filter(offline => !offline),
        switchMap(() => timer(1500))
      )
    ).pipe(
      filter(() => !this.isSyncing && this.isLeader),
      switchMap(() => this.syncAll())
    ).subscribe();
  }

  /** Sync everything: orders then shifts. */
  syncAll(): Observable<void> {
    return new Observable(subscriber => {
      this.isSyncing = true;
      this.syncPendingOrders().then(() => this.syncPendingShifts()).then(() => {
        this.isSyncing = false;
        subscriber.next();
        subscriber.complete();
      }).catch(() => {
        this.isSyncing = false;
        subscriber.next();
        subscriber.complete();
      });
    });
  }

  /** Sync all pending orders. Returns results. */
  syncPendingOrders(): Promise<OfflineOrderSyncResult[]> {
    return this.localStore.getPendingOrders().then(orders => {
      if (orders.length === 0) return [];
      const batch = orders.map(o => this.toSyncRequest(o));
      return new Promise<OfflineOrderSyncResult[]>((resolve) => {
        this.http.post<ApiResponse<OfflineOrderSyncResult[]>>(this.ordersUrl, { orders: batch }).subscribe({
          next: async res => {
            const results = res.data ?? [];
            for (const r of results) {
              if (r.status === 'ok' && r.serverOrderId != null) {
                await this.localStore.markOrderSynced(r.localId, r.serverOrderId);
              } else if (r.status === 'rejected') {
                await this.localStore.markOrderFailed(r.localId, r.reason ?? 'Unknown error');
              }
            }
            resolve(results);
          },
          error: async err => {
            const msg = err.error?.message ?? err.message ?? 'Sync failed';
            for (const o of orders) {
              await this.localStore.markOrderFailed(o.localId, msg);
            }
            resolve([]);
          }
        });
      });
    });
  }

  /** Sync pending offline shifts (open + close) to the server. */
  private async syncPendingShifts(): Promise<void> {
    const pendingShifts = await this.localStore.getPendingShifts();
    for (const shift of pendingShifts) {
      await this.syncOneShift(shift);
    }
  }

  private syncOneShift(shift: LocalShift): Promise<void> {
    return new Promise<void>((resolve) => {
      this.http.post<ApiResponse<{ id: number }>>(this.shiftsUrl, {
        openingFloat: shift.openingFloat
      }).subscribe({
        next: async res => {
          const serverId = res.data?.id;
          if (serverId) {
            await this.localStore.markShiftSynced(shift.localId, serverId);
          } else {
            await this.localStore.markShiftFailed(shift.localId, 'No server ID returned');
          }
          resolve();
        },
        error: async err => {
          const msg = err.error?.message ?? err.message ?? 'Shift sync failed';
          await this.localStore.markShiftFailed(shift.localId, msg);
          resolve();
        }
      });
    });
  }

  private toSyncRequest(order: LocalOrder): OfflineOrderSyncRequest {
    return {
      localId: order.localId,
      deviceId: order.deviceId,
      items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: order.paymentMethod || 'CASH',
      discount: order.discount ?? 0,
      customerId: order.customerId,
      pointsToRedeem: order.pointsToRedeem
    };
  }
}
