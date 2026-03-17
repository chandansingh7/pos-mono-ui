import { Injectable } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ProductService } from './product.service';
import { CompanyService } from './company.service';
import { CustomerService } from './customer.service';
import { NetworkStatusService } from './network-status.service';
import { PosLocalStoreService } from './pos-local-store.service';

/**
 * Syncs master data (company, products, customers) from API to IndexedDB when online.
 * Call syncWhenOnline() on app init; POS reads from local store when offline.
 */
@Injectable({ providedIn: 'root' })
export class DataSyncService {

  constructor(
    private productService: ProductService,
    private companyService: CompanyService,
    private customerService: CustomerService,
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService
  ) {}

  /** Sync master data when online. Call from app init. */
  syncWhenOnline(): void {
    this.networkStatus.isOffline$.subscribe(offline => {
      if (!offline) {
        this.performSync();
      }
    });
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.performSync();
    }
  }

  private performSync(): void {
    forkJoin({
      company: this.companyService.get().pipe(catchError(() => of({ data: null }))),
      products: this.productService.getAll('', undefined, 0, 500).pipe(catchError(() => of({ data: { content: [] } }))),
      customers: this.customerService.getAll('', 0, 500).pipe(catchError(() => of({ data: { content: [] } })))
    }).pipe(
      tap(async res => {
        await this.localStore.init();
        if (res.company?.data) {
          await this.localStore.saveCompany(res.company.data);
        }
        if (res.products?.data?.content?.length) {
          await this.localStore.saveProducts(res.products.data.content);
        }
        if (res.customers?.data?.content?.length) {
          await this.localStore.saveCustomers(res.customers.data.content);
        }
        await this.localStore.updateSyncState({
          lastFullSyncAt: new Date().toISOString(),
          lastProductsSyncAt: new Date().toISOString(),
          lastCustomersSyncAt: new Date().toISOString()
        });
      }),
      catchError(() => of(null))
    ).subscribe();
  }
}
