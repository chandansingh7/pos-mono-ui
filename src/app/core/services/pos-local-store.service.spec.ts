import { TestBed } from '@angular/core/testing';
import { PosLocalStoreService, LocalOrder, LocalShift } from './pos-local-store.service';
import { ProductResponse } from '../models/product.models';
import { CompanyResponse } from '../models/company.models';

const TEST_DB_NAME = 'pos_offline_db';

/**
 * Close the service connection first, then delete the DB.
 * Without closing, indexedDB.deleteDatabase fires onblocked and never
 * completes while an open IDBDatabase connection exists.
 */
function deleteTestDb(service?: PosLocalStoreService): Promise<void> {
  service?.closeForTesting();
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(TEST_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    // onblocked fires when another connection is still open; we already closed
    // ours above, so this should not happen — but resolve anyway just in case.
    req.onblocked = () => resolve();
  });
}

describe('PosLocalStoreService', () => {
  let service: PosLocalStoreService;

  beforeEach(async () => {
    // Tear down any existing service + DB before creating a fresh one
    const prev = TestBed.inject(PosLocalStoreService);
    await deleteTestDb(prev);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [PosLocalStoreService]
    });
    service = TestBed.inject(PosLocalStoreService);
    // Clear device ID from localStorage so each test starts clean
    localStorage.removeItem('pos_device_id_v1');
  });

  afterEach(async () => {
    await deleteTestDb(service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getDeviceId should return a string', () => {
    const id = service.getDeviceId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(id.startsWith('dev_')).toBeTrue();
  });

  it('getDeviceId should be stable across calls', () => {
    const id1 = service.getDeviceId();
    const id2 = service.getDeviceId();
    expect(id1).toBe(id2);
  });

  it('init should resolve', async () => {
    await expectAsync(service.init()).toBeResolved();
  });

  it('saveCompany and getCompany should round-trip', async () => {
    await service.init();
    const company: CompanyResponse = {
      id: 1,
      name: 'Test Co',
      address: '123 Main St',
      phone: '+1234567890',
      email: 'test@example.com',
      displayCurrency: 'USD',
      locale: 'en-US',
      receiptPaperSize: '80mm',
      posLayout: 'grid',
      posQuickShiftControls: false,
      updatedAt: new Date().toISOString()
    };
    await service.saveCompany(company);
    const got = await service.getCompany();
    expect(got).toBeTruthy();
    expect(got?.name).toBe('Test Co');
  });

  it('saveProducts and getProducts should round-trip', async () => {
    await service.init();
    const products: ProductResponse[] = [
      { id: 1, name: 'Product A', sku: 'SKU1', barcode: '123', price: 10, quantity: 5, active: true, saleUnit: 'EACH', saleUnitType: 'PIECE', categoryId: 1, categoryName: 'Cat', imageUrl: '', createdAt: '', updatedAt: '', updatedBy: 'test' }
    ];
    await service.saveProducts(products);
    const got = await service.getProducts();
    expect(got.length).toBe(1);
    expect(got[0].name).toBe('Product A');
  });

  it('getProductByBarcode should find product', async () => {
    await service.init();
    const products: ProductResponse[] = [
      { id: 1, name: 'Product A', sku: 'SKU1', barcode: '123', price: 10, quantity: 5, active: true, saleUnit: 'EACH', saleUnitType: 'PIECE', categoryId: 1, categoryName: 'Cat', imageUrl: '', createdAt: '', updatedAt: '', updatedBy: 'test' }
    ];
    await service.saveProducts(products);
    const got = await service.getProductByBarcode('123');
    expect(got).toBeTruthy();
    expect(got?.name).toBe('Product A');
  });

  it('saveLocalOrder and getPendingOrders should work', async () => {
    await service.init();
    const order: LocalOrder = {
      localId: 'loc_test_1',
      tempNumber: 'T000001',
      items: [{ productId: 1, quantity: 2 }],
      subtotal: 20,
      tax: 2,
      discount: 0,
      total: 22,
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
      deviceId: service.getDeviceId(),
      syncStatus: 'pending'
    };
    await service.saveLocalOrder(order);
    const pending = await service.getPendingOrders();
    expect(pending.length).toBe(1);
    expect(pending[0].localId).toBe('loc_test_1');
  });

  it('markOrderFailed and getFailedOrders should work', async () => {
    await service.init();
    const order: LocalOrder = {
      localId: 'loc_fail_1',
      tempNumber: 'T000002',
      items: [{ productId: 1, quantity: 1 }],
      subtotal: 10,
      tax: 1,
      discount: 0,
      total: 11,
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
      deviceId: service.getDeviceId(),
      syncStatus: 'pending'
    };
    await service.saveLocalOrder(order);
    await service.markOrderFailed('loc_fail_1', 'Insufficient stock');
    const failed = await service.getFailedOrders();
    expect(failed.length).toBe(1);
    expect(failed[0].lastSyncError).toBe('Insufficient stock');
  });

  it('resetOrderToPending should move failed back to pending', async () => {
    await service.init();
    const order: LocalOrder = {
      localId: 'loc_retry_1',
      tempNumber: 'T000003',
      items: [{ productId: 1, quantity: 1 }],
      subtotal: 10,
      tax: 1,
      discount: 0,
      total: 11,
      paymentMethod: 'CASH',
      createdAt: new Date().toISOString(),
      deviceId: service.getDeviceId(),
      syncStatus: 'failed',
      lastSyncError: 'Product not found'
    };
    await service.saveLocalOrder(order);
    await service.resetOrderToPending('loc_retry_1');
    const pending = await service.getPendingOrders();
    expect(pending.some(o => o.localId === 'loc_retry_1')).toBeTrue();
  });

  it('saveLocalShift and getOpenLocalShift should work', async () => {
    await service.init();
    const shift: LocalShift = {
      localId: 'shift_test_1',
      openingFloat: 100,
      openedAt: new Date().toISOString(),
      deviceId: service.getDeviceId(),
      syncStatus: 'pending'
    };
    await service.saveLocalShift(shift);
    const open = await service.getOpenLocalShift();
    expect(open).toBeTruthy();
    expect(open?.localId).toBe('shift_test_1');
    expect(open?.openingFloat).toBe(100);
  });

  it('markShiftSynced should update status and serverShiftId', async () => {
    await service.init();
    const shift: LocalShift = {
      localId: 'shift_sync_1',
      openingFloat: 50,
      openedAt: new Date().toISOString(),
      deviceId: service.getDeviceId(),
      syncStatus: 'pending'
    };
    await service.saveLocalShift(shift);
    await service.markShiftSynced('shift_sync_1', 42);
    const stored = await service.getLocalShift('shift_sync_1');
    expect(stored?.syncStatus).toBe('synced');
    expect(stored?.serverShiftId).toBe(42);
  });

  it('getOfflineReportToday should aggregate local orders', async () => {
    await service.init();
    const today = new Date().toISOString();
    const order1: LocalOrder = {
      localId: 'report_1', tempNumber: 'T1',
      items: [{ productId: 1, quantity: 1 }],
      subtotal: 10, tax: 1, discount: 0, total: 11,
      paymentMethod: 'CASH', createdAt: today,
      deviceId: service.getDeviceId(), syncStatus: 'pending'
    };
    const order2: LocalOrder = {
      localId: 'report_2', tempNumber: 'T2',
      items: [{ productId: 2, quantity: 2 }],
      subtotal: 20, tax: 2, discount: 0, total: 22,
      paymentMethod: 'CREDIT_CARD', createdAt: today,
      deviceId: service.getDeviceId(), syncStatus: 'synced'
    };
    await service.saveLocalOrder(order1);
    await service.saveLocalOrder(order2);

    const report = await service.getOfflineReportToday();
    expect(report.orderCount).toBe(2);
    expect(report.revenue).toBe(33);
    expect(report.cashRevenue).toBe(11);
    expect(report.paymentBreakdown['CASH']).toBe(11);
    expect(report.paymentBreakdown['CREDIT_CARD']).toBe(22);
    expect(report.pendingSync).toBe(1);
  });
});
