import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { NetworkStatusService } from './core/services/network-status.service';
import { DataSyncService } from './core/services/data-sync.service';
import { OfflineSyncService } from './core/services/offline-sync.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  constructor(
    private snackBar: MatSnackBar,
    private networkStatus: NetworkStatusService,
    private dataSync: DataSyncService,
    private offlineSync: OfflineSyncService
  ) {
    this.sub = this.networkStatus.isOffline$.subscribe(isOffline => {
      if (isOffline) {
        this.snackBar.open('You are offline. Some actions may not work.', 'Dismiss', { duration: 5000 });
      } else {
        this.snackBar.open('Back online.', 'Dismiss', { duration: 3000 });
        this.offlineSync.triggerSync();
      }
    });
  }

  ngOnInit(): void {
    this.dataSync.syncWhenOnline();
    this.offlineSync.startSyncLoop();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
