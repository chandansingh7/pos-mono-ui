import { TestBed } from '@angular/core/testing';
import { PosLocalStoreService, LocalOrder } from './pos-local-store.service';
import { ProductResponse } from '../models/product.models';
import { CompanyResponse } from '../models/company.models';
import { CustomerResponse } from '../models/customer.models';

describe('PosLocalStoreService', () => {
  let service: PosLocalStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PosLocalStoreService]
    });
    service = TestBed.inject(PosLocalStoreService);
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
});
