import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { NetworkStatusService } from './network-status.service';

describe('NetworkStatusService', () => {
  let service: NetworkStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NetworkStatusService]
    });
    service = TestBed.inject(NetworkStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit offline status when offline event fires', (done) => {
    const zone = TestBed.inject(NgZone);
    const sub = service.isOffline$.subscribe(v => {
      if (v === true) {
        expect(v).toBeTrue();
        sub.unsubscribe();
        done();
      }
    });

    zone.run(() => {
      window.dispatchEvent(new Event('offline'));
    });
  });
});
