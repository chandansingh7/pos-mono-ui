import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Tracks basic online/offline status for the UI.
 * Phase 1: used to show a simple offline banner / snackbar.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly offlineSubject = new BehaviorSubject<boolean>(false);
  readonly isOffline$: Observable<boolean> = this.offlineSubject.asObservable();

  constructor(private zone: NgZone) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.update(false));
      window.addEventListener('offline', () => this.update(true));
      // Initialise from current navigator state when available.
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        this.offlineSubject.next(!navigator.onLine);
      }
    }
  }

  private update(isOffline: boolean): void {
    this.zone.run(() => this.offlineSubject.next(isOffline));
  }
}
