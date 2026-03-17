import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { NetworkStatusService } from './core/services/network-status.service';
import { DataSyncService } from './core/services/data-sync.service';
import { OfflineSyncService } from './core/services/offline-sync.service';

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule, MatSnackBarModule],
    declarations: [AppComponent],
    providers: [
      { provide: NetworkStatusService, useValue: { isOffline$: of(false) } },
      { provide: DataSyncService, useValue: { syncWhenOnline: jasmine.createSpy() } },
      { provide: OfflineSyncService, useValue: { startSyncLoop: jasmine.createSpy(), triggerSync: jasmine.createSpy() } }
    ]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
