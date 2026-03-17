import { Injectable } from '@angular/core';
import { ProductResponse } from '../models/product.models';
import { CompanyResponse } from '../models/company.models';
import { CustomerResponse } from '../models/customer.models';
import { PaymentMethod } from '../models/order.models';

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 1;
const STORE_COMPANY = 'company';
const STORE_PRODUCTS = 'products';
const STORE_CUSTOMERS = 'customers';
const STORE_ORDERS_LOCAL = 'orders_local';
const STORE_SYNC_STATE = 'sync_state';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface LocalOrderItem {
  productId: number;
  quantity: number;
  productName?: string;
  unitPrice?: number;
  subtotal?: number;
}

export interface LocalOrder {
  localId: string;
  tempNumber: string;
  items: LocalOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerId?: number;
  customerName?: string;
  pointsToRedeem?: number;
  createdAt: string;
  deviceId: string;
  syncStatus: SyncStatus;
  serverOrderId?: number;
  lastSyncError?: string;
}

export interface SyncState {
  lastFullSyncAt: string;
  lastProductsSyncAt: string;
  lastCustomersSyncAt: string;
  deviceId: string;
  schemaVersion: number;
}

@Injectable({ providedIn: 'root' })
export class PosLocalStoreService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private deviceId: string | null = null;

  private readonly DEVICE_ID_KEY = 'pos_device_id_v1';

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_COMPANY)) {
          db.createObjectStore(STORE_COMPANY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          const ps = db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
          ps.createIndex('barcode', 'barcode', { unique: false });
          ps.createIndex('sku', 'sku', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_CUSTOMERS)) {
          const cs = db.createObjectStore(STORE_CUSTOMERS, { keyPath: 'id' });
          cs.createIndex('memberCardBarcode', 'memberCardBarcode', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_ORDERS_LOCAL)) {
          const os = db.createObjectStore(STORE_ORDERS_LOCAL, { keyPath: 'localId' });
          os.createIndex('syncStatus', 'syncStatus', { unique: false });
          os.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SYNC_STATE)) {
          db.createObjectStore(STORE_SYNC_STATE, { keyPath: 'key' });
        }
      };
    });
    return this.initPromise;
  }

  getDeviceId(): string {
    if (this.deviceId) return this.deviceId;
    let id = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 14) + '_' + Date.now();
      localStorage.setItem(this.DEVICE_ID_KEY, id);
    }
    this.deviceId = id;
    return id;
  }

  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) throw new Error('IndexedDB not initialized');
    return this.db;
  }

  private run<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return this.ensureDb().then(db => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async saveCompany(company: CompanyResponse): Promise<void> {
    await this.run(STORE_COMPANY, 'readwrite', s => s.put(company));
  }

  async getCompany(): Promise<CompanyResponse | null> {
    const companies = await this.run<CompanyResponse[]>(STORE_COMPANY, 'readonly', s => s.getAll());
    return companies && companies.length > 0 ? companies[0] : null;
  }

  async saveProducts(products: ProductResponse[]): Promise<void> {
    const tx = (await this.ensureDb()).transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear();
    products.forEach(p => store.put(p));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getProducts(search?: string): Promise<ProductResponse[]> {
    const all = await this.run<ProductResponse[]>(STORE_PRODUCTS, 'readonly', s => s.getAll());
    if (!search || !search.trim()) return all || [];
    const q = search.toLowerCase().trim();
    return (all || []).filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  }

  async getProductByBarcode(barcode: string): Promise<ProductResponse | null> {
    const all = await this.run<ProductResponse[]>(STORE_PRODUCTS, 'readonly', s => s.getAll());
    const match = (all || []).find(p => (p.barcode || '').toLowerCase() === (barcode || '').toLowerCase());
    return match || null;
  }

  async saveCustomers(customers: CustomerResponse[]): Promise<void> {
    const tx = (await this.ensureDb()).transaction(STORE_CUSTOMERS, 'readwrite');
    const store = tx.objectStore(STORE_CUSTOMERS);
    store.clear();
    customers.forEach(c => store.put(c));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCustomers(search?: string): Promise<CustomerResponse[]> {
    const all = await this.run<CustomerResponse[]>(STORE_CUSTOMERS, 'readonly', s => s.getAll());
    if (!search || !search.trim()) return all || [];
    const q = search.toLowerCase().trim();
    return (all || []).filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.memberCardBarcode || '').toLowerCase().includes(q)
    );
  }

  async getCustomerByMemberCard(card: string): Promise<CustomerResponse | null> {
    const all = await this.run<CustomerResponse[]>(STORE_CUSTOMERS, 'readonly', s => s.getAll());
    const match = (all || []).find(c => (c.memberCardBarcode || '').toLowerCase() === (card || '').toLowerCase());
    return match || null;
  }

  async saveLocalOrder(order: LocalOrder): Promise<void> {
    await this.run(STORE_ORDERS_LOCAL, 'readwrite', s => s.put(order));
  }

  async getPendingOrders(): Promise<LocalOrder[]> {
    const all = await this.run<LocalOrder[]>(STORE_ORDERS_LOCAL, 'readonly', s => s.getAll());
    return (all || []).filter(o => o.syncStatus === 'pending');
  }

  async getAllLocalOrders(): Promise<LocalOrder[]> {
    const all = await this.run<LocalOrder[]>(STORE_ORDERS_LOCAL, 'readonly', s => s.getAll());
    return (all || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  async markOrderSynced(localId: string, serverOrderId: number): Promise<void> {
    const order = await this.run<LocalOrder | undefined>(STORE_ORDERS_LOCAL, 'readonly', s => s.get(localId));
    if (order) {
      order.syncStatus = 'synced';
      order.serverOrderId = serverOrderId;
      order.lastSyncError = undefined;
      await this.run(STORE_ORDERS_LOCAL, 'readwrite', s => s.put(order));
    }
  }

  async markOrderFailed(localId: string, reason: string): Promise<void> {
    const order = await this.run<LocalOrder | undefined>(STORE_ORDERS_LOCAL, 'readonly', s => s.get(localId));
    if (order) {
      order.syncStatus = 'failed';
      order.lastSyncError = reason;
      await this.run(STORE_ORDERS_LOCAL, 'readwrite', s => s.put(order));
    }
  }

  async updateSyncState(partial: Partial<SyncState>): Promise<void> {
    const existing = await this.run<SyncState | undefined>(STORE_SYNC_STATE, 'readonly', s => s.get('main'));
    const merged: SyncState = {
      lastFullSyncAt: '',
      lastProductsSyncAt: '',
      lastCustomersSyncAt: '',
      deviceId: this.getDeviceId(),
      schemaVersion: 1,
      ...existing,
      ...partial
    };
    await this.run(STORE_SYNC_STATE, 'readwrite', s => s.put({ ...merged, key: 'main' }));
  }

  async getSyncState(): Promise<SyncState | null> {
    const s = await this.run<SyncState & { key: string } | undefined>(STORE_SYNC_STATE, 'readonly', st => st.get('main'));
    if (!s) return null;
    const { key: _, ...rest } = s;
    return rest as SyncState;
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.getPendingOrders();
    return pending.length;
  }

  async getFailedOrders(): Promise<LocalOrder[]> {
    const all = await this.run<LocalOrder[]>(STORE_ORDERS_LOCAL, 'readonly', s => s.getAll());
    return (all || []).filter(o => o.syncStatus === 'failed');
  }

  async getFailedCount(): Promise<number> {
    const failed = await this.getFailedOrders();
    return failed.length;
  }

  /** Reset a failed order to pending so it can be retried on next sync. */
  async resetOrderToPending(localId: string): Promise<void> {
    const order = await this.run<LocalOrder | undefined>(STORE_ORDERS_LOCAL, 'readonly', s => s.get(localId));
    if (order && order.syncStatus === 'failed') {
      order.syncStatus = 'pending';
      order.lastSyncError = undefined;
      await this.run(STORE_ORDERS_LOCAL, 'readwrite', s => s.put(order));
    }
  }

  /** Reset all failed orders to pending for retry. */
  async resetAllFailedToPending(): Promise<number> {
    const failed = await this.getFailedOrders();
    for (const o of failed) {
      o.syncStatus = 'pending';
      o.lastSyncError = undefined;
      await this.run(STORE_ORDERS_LOCAL, 'readwrite', s => s.put(o));
    }
    return failed.length;
  }
}
