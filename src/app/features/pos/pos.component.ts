import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../core/services/product.service';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { CompanyService } from '../../core/services/company.service';
import { RewardService } from '../../core/services/reward.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { PosLocalStoreService, LocalOrder } from '../../core/services/pos-local-store.service';
import { OfflineSettingsService } from '../../core/services/offline-settings.service';
import { OfflineSyncService } from '../../core/services/offline-sync.service';
import { ProductResponse, getUnitLabel } from '../../core/models/product.models';
import { CustomerResponse } from '../../core/models/customer.models';
import { OrderResponse, PaymentMethod } from '../../core/models/order.models';
import { CompanyResponse } from '../../core/models/company.models';
import { ShiftService } from '../../core/services/shift.service';
import { formatCurrency } from '../../core/utils/currency.util';
import { StartShiftDialogComponent } from '../../shared/components/start-shift-dialog/start-shift-dialog.component';
import { CloseShiftDialogComponent } from '../../shared/components/close-shift-dialog/close-shift-dialog.component';

interface CartItem {
  product: ProductResponse;
  quantity: number;
  subtotal: number;
}

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  products: ProductResponse[] = [];
  customers: CustomerResponse[] = [];
  cart: CartItem[] = [];

  searchControl = new FormControl('');
  customerControl = new FormControl('');
  barcodeControl = new FormControl('');

  selectedCustomer: CustomerResponse | null = null;
  paymentMethod: PaymentMethod = 'CASH';
  discount = 0;
  pointsToRedeem = 0;
  rewardConfig: { pointsPerDollar: number; redemptionRate: number } | null = null;
  loading = false;
  productsLoading = false;
  completedOrder: OrderResponse | null = null;
  /** Offline order just placed (shown as receipt until sync). */
  completedLocalOrder: LocalOrder | null = null;
  company: CompanyResponse | null = null;
  isOffline = false;
  canUsePosOffline = false;
  private companySub?: Subscription;
  /** Scan layout: last product added (shown at top of left panel; auto-hides after CURRENT_PRODUCT_BANNER_SECONDS). */
  lastAddedProduct: ProductResponse | null = null;
  private currentProductBannerTimer: ReturnType<typeof setTimeout> | null = null;

  /** Seconds before the "last added product" banner auto-hides (scan layout). */
  private static readonly CURRENT_PRODUCT_BANNER_SECONDS = 3;

  hasOpenShift = true;

  paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' }
  ];

  constructor(
    private productService: ProductService,
    private customerService: CustomerService,
    private orderService: OrderService,
    private companyService: CompanyService,
    private rewardService: RewardService,
    private shiftService: ShiftService,
    private networkStatus: NetworkStatusService,
    private localStore: PosLocalStoreService,
    private offlineSettings: OfflineSettingsService,
    private offlineSync: OfflineSyncService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.checkShift();
    this.updateCanUsePosOffline();
    this.networkStatus.isOffline$.subscribe(off => {
      this.isOffline = off;
      this.updateCanUsePosOffline();
      this.loadProducts(this.searchControl.value || '');
      if (this.isOffline) {
        this.loadCompanyFromLocal();
      }
    });
    this.loadProducts();
    this.rewardService.getConfig().subscribe({
      next: res => { this.rewardConfig = res.data ?? null; }
    });
    this.company = this.companyService.getCached();
    if (!this.company) {
      if (this.isOffline) {
        this.loadCompanyFromLocal();
      } else {
        this.companyService.get().subscribe({ next: res => { this.company = res.data ?? null; this.updateCanUsePosOffline(); } });
      }
    }
    this.companySub = this.companyService.company$.subscribe(c => {
      this.company = c ?? this.company;
      this.updateCanUsePosOffline();
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(val => this.loadProducts(val || ''));

    this.barcodeControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(barcode => {
      if (this.company?.posLayout === 'scan') {
        if (!barcode || !(barcode as string).trim()) {
          this.loadProducts('');
        } else {
          this.scanInputValue(barcode as string);
        }
      } else if (barcode && (barcode as string).length > 3) {
        this.lookupBarcode(barcode as string);
      }
    });
  }

  private async loadCompanyFromLocal(): Promise<void> {
    await this.localStore.init();
    const c = await this.localStore.getCompany();
    if (c) {
      this.company = c;
      this.updateCanUsePosOffline();
    }
  }

  private updateCanUsePosOffline(): void {
    this.canUsePosOffline = this.offlineSettings.getSettings(this.company).allowPos;
  }

  get showShiftControls(): boolean {
    return !!this.company?.posQuickShiftControls;
  }

  /** True when company uses the scan layout (product list + single search/key-in; barcode adds to cart). */
  get isScanLayout(): boolean {
    return this.company?.posLayout === 'scan';
  }

  private checkShift(): void {
    this.shiftService.getCurrent().subscribe({
      next: res => { this.hasOpenShift = !!res.data; },
      error: () => { this.hasOpenShift = false; }
    });
  }

  openShiftDialog(): void {
    const ref = this.dialog.open(StartShiftDialogComponent, {
      width: '420px',
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.hasOpenShift = true;
      } else {
        this.checkShift();
      }
    });
  }

  openCloseShiftDialog(): void {
    const ref = this.dialog.open(CloseShiftDialogComponent, {
      width: '460px',
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.hasOpenShift = false;
      } else {
        this.checkShift();
      }
    });
  }

  loadProducts(search = ''): void {
    this.productsLoading = true;
    if (this.isOffline) {
      this.localStore.init().then(() =>
        this.localStore.getProducts(search).then(prods => {
          this.products = prods;
          this.productsLoading = false;
        })
      );
    } else {
      this.productService.getAll(search, undefined, 0, 30).subscribe({
        next: res => { this.products = res.data?.content || []; this.productsLoading = false; },
        error: () => { this.productsLoading = false; }
      });
    }
  }

  customersLoaded = false;

  loadCustomers(): void {
    if (this.customersLoaded) return;
    if (this.isOffline) {
      this.localStore.init().then(() =>
        this.localStore.getCustomers().then(custs => {
          this.customers = custs;
          this.customersLoaded = true;
        })
      );
    } else {
      this.customerService.getAll('', 0, 25).subscribe({
        next: res => {
          this.customers = res.data?.content || [];
          this.customersLoaded = true;
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.companySub?.unsubscribe();
    if (this.currentProductBannerTimer) {
      clearTimeout(this.currentProductBannerTimer);
    }
  }

  lookupBarcode(barcode: string): void {
    const tryMemberCard = () => {
      if (this.isOffline) {
        this.localStore.getCustomerByMemberCard(barcode).then(c => {
          if (c) {
            this.selectedCustomer = c;
            if (!this.customers.find(x => x.id === c.id)) this.customers = [...this.customers, c];
            this.barcodeControl.setValue('', { emitEvent: false });
            this.snackBar.open('Member: ' + c.name + ' (' + (c.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open('Product or member card not found: ' + barcode, 'Close', { duration: 3000 });
          }
        });
      } else {
        this.customerService.getByMemberCard(barcode).subscribe({
          next: res => {
            if (res.data) {
              this.selectedCustomer = res.data;
              if (!this.customers.find(c => c.id === res.data!.id)) this.customers = [...this.customers, res.data];
              this.barcodeControl.setValue('', { emitEvent: false });
              this.snackBar.open('Member: ' + res.data.name + ' (' + (res.data.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
            } else {
              this.snackBar.open('Product or member card not found: ' + barcode, 'Close', { duration: 3000 });
            }
          },
          error: () => this.snackBar.open('Product or member card not found: ' + barcode, 'Close', { duration: 3000 })
        });
      }
    };
    if (this.isOffline) {
      this.localStore.getProductByBarcode(barcode).then(p => {
        if (p) {
          this.addToCart(p);
          this.barcodeControl.setValue('', { emitEvent: false });
        } else {
          tryMemberCard();
        }
      });
    } else {
      this.productService.getByBarcode(barcode).subscribe({
        next: res => {
          if (res.data) {
            this.addToCart(res.data);
            this.barcodeControl.setValue('', { emitEvent: false });
          } else {
            tryMemberCard();
          }
        },
        error: () => tryMemberCard()
      });
    }
  }

  /**
   * Scan layout: one field for search or barcode. Try barcode first; if not found, try member card; else filter product list.
   */
  scanInputValue(value: string): void {
    const trimmed = (value || '').trim();
    if (trimmed.length < 2) {
      this.loadProducts(trimmed);
      return;
    }
    if (this.isOffline) {
      this.localStore.getProductByBarcode(trimmed).then(p => {
        if (p) {
          this.addToCart(p);
          this.barcodeControl.setValue('', { emitEvent: false });
        } else {
          this.tryMemberCardThenSearch(trimmed);
        }
      });
    } else {
      this.productService.getByBarcode(trimmed).subscribe({
        next: res => {
          if (res.data) {
            this.addToCart(res.data);
            this.barcodeControl.setValue('', { emitEvent: false });
          } else {
            this.tryMemberCardThenSearch(trimmed);
          }
        },
        error: () => this.tryMemberCardThenSearch(trimmed)
      });
    }
  }

  private tryMemberCardThenSearch(value: string): void {
    if (this.isOffline) {
      this.localStore.getCustomerByMemberCard(value).then(c => {
        if (c) {
          this.selectedCustomer = c;
          if (!this.customers.find(x => x.id === c.id)) this.customers = [...this.customers, c];
          this.barcodeControl.setValue('', { emitEvent: false });
          this.snackBar.open('Member: ' + c.name + ' (' + (c.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
        } else {
          this.loadProducts(value);
        }
      });
    } else {
      this.customerService.getByMemberCard(value).subscribe({
        next: res => {
          if (res.data) {
            this.selectedCustomer = res.data;
            if (!this.customers.find(c => c.id === res.data!.id)) this.customers = [...this.customers, res.data];
            this.barcodeControl.setValue('', { emitEvent: false });
            this.snackBar.open('Member: ' + res.data.name + ' (' + (res.data.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
          } else {
            this.loadProducts(value);
          }
        },
        error: () => this.loadProducts(value)
      });
    }
  }

  addToCart(product: ProductResponse): void {
    if (!this.isOffline && product.quantity <= 0) {
      this.snackBar.open(`${product.name} is out of stock`, 'Close', { duration: 3000 });
      return;
    }
    const existing = this.cart.find(i => i.product.id === product.id);
    if (existing) {
      if (!this.isOffline && existing.quantity >= product.quantity) {
        this.snackBar.open('Cannot add more than available stock', 'Close', { duration: 3000 });
        return;
      }
      existing.quantity++;
      existing.subtotal = existing.quantity * existing.product.price;
    } else {
      this.cart.push({ product, quantity: 1, subtotal: product.price });
    }
    if (this.isScanLayout) {
      this.scheduleCurrentProductBannerHide();
      this.lastAddedProduct = product;
    }
  }

  private scheduleCurrentProductBannerHide(): void {
    if (this.currentProductBannerTimer) {
      clearTimeout(this.currentProductBannerTimer);
    }
    this.currentProductBannerTimer = setTimeout(() => {
      this.lastAddedProduct = null;
      this.currentProductBannerTimer = null;
    }, PosComponent.CURRENT_PRODUCT_BANNER_SECONDS * 1000);
  }

  updateQty(item: CartItem, qty: number): void {
    if (qty <= 0) { this.removeFromCart(item); return; }
    if (!this.isOffline && qty > item.product.quantity) {
      this.snackBar.open('Cannot exceed available stock', 'Close', { duration: 2000 });
      return;
    }
    item.quantity = qty;
    item.subtotal = qty * item.product.price;
  }

  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => i !== item);
    if (this.cart.length === 0) {
      this.lastAddedProduct = null;
      if (this.currentProductBannerTimer) {
        clearTimeout(this.currentProductBannerTimer);
        this.currentProductBannerTimer = null;
      }
    }
  }

  clearCart(): void {
    this.cart = [];
    this.lastAddedProduct = null;
    if (this.currentProductBannerTimer) {
      clearTimeout(this.currentProductBannerTimer);
      this.currentProductBannerTimer = null;
    }
    this.selectedCustomer = null;
    this.discount = 0;
    this.pointsToRedeem = 0;
    this.paymentMethod = 'CASH';
    this.completedOrder = null;
  }

  get subtotal(): number {
    return this.cart.reduce((sum, i) => sum + i.subtotal, 0);
  }

  get taxEnabled(): boolean {
    return this.company?.taxEnabled !== false;
  }

  get taxRate(): number {
    if (!this.taxEnabled) return 0;
    return this.company?.taxRate != null ? this.company.taxRate : 0.10;
  }

  get taxLabel(): string {
    return this.company?.taxId || 'Tax';
  }

  get tax(): number {
    if (!this.taxEnabled) return 0;
    const afterDiscount = Math.max(0, this.subtotal - (this.discount || 0) - this.redemptionDiscount);
    return +(afterDiscount * this.taxRate).toFixed(2);
  }

  get redemptionDiscount(): number {
    if (!this.rewardConfig || !this.selectedCustomer || this.pointsToRedeem <= 0) return 0;
    const rate = this.rewardConfig.redemptionRate || 100;
    return this.pointsToRedeem / rate;
  }

  get total(): number {
    const afterDiscount = Math.max(0, this.subtotal - (this.discount || 0) - this.redemptionDiscount);
    return +(afterDiscount + this.tax).toFixed(2);
  }

  /** For cart/receipt: show "each" or "per kg", "per L", etc. */
  unitLabel(unit: string | null | undefined): string {
    return getUnitLabel(unit);
  }

  /** True when product is sold by weight or volume (allows decimal quantity). */
  isDecimalQty(product: ProductResponse): boolean {
    const t = product.saleUnitType?.toUpperCase();
    return t === 'WEIGHT' || t === 'VOLUME';
  }

  /** Handle quantity input change for weight/volume products. */
  onQtyInputChange(item: CartItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input?.value?.trim();
    const qty = raw ? parseFloat(raw) : 0;
    if (isNaN(qty) || qty < 0.001) {
      this.removeFromCart(item);
      return;
    }
    this.updateQty(item, qty);
  }

  get maxRedeemPoints(): number {
    if (!this.selectedCustomer) return 0;
    const balance = this.selectedCustomer.rewardPoints ?? 0;
    if (!this.rewardConfig || this.rewardConfig.redemptionRate <= 0) return balance;
    const maxByOrder = Math.floor((this.subtotal + this.tax - (this.discount || 0)) * this.rewardConfig.redemptionRate);
    return Math.min(balance, Math.max(0, maxByOrder));
  }

  placeOrder(): void {
    if (!this.cart.length) {
      this.snackBar.open('Cart is empty', 'Close', { duration: 2000 });
      return;
    }
    if (this.isOffline && !this.canUsePosOffline) {
      this.snackBar.open('POS is disabled when offline. Enable it in Settings → Offline behaviour.', 'Close', { duration: 5000 });
      return;
    }
    if (!this.isOffline && this.paymentMethod === 'CASH' && !this.hasOpenShift) {
      this.snackBar.open('Open a shift on the Shifts page before taking cash payments.', 'Close', { duration: 4000 });
      return;
    }
    this.loading = true;
    if (this.isOffline) {
      this.placeOrderOffline();
    } else {
      this.placeOrderOnline();
    }
  }

  private placeOrderOnline(): void {
    const request = {
      customerId: this.selectedCustomer?.id,
      items: this.cart.map(i => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod: this.paymentMethod,
      discount: this.discount || 0,
      pointsToRedeem: this.pointsToRedeem > 0 ? this.pointsToRedeem : undefined
    };
    this.orderService.create(request).subscribe({
      next: res => {
        this.completedOrder = res.data;
        this.completedLocalOrder = null;
        this.loading = false;
        this.snackBar.open('Order placed successfully!', 'Close', { duration: 3000 });
        this.clearCartAfterOrder();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to place order', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }

  private async placeOrderOffline(): Promise<void> {
    const localId = 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    const tempNumber = 'T' + Date.now().toString().slice(-6);
    const st = this.subtotal;
    const tx = this.tax;
    const dc = this.discount || 0;
    const rd = this.redemptionDiscount;
    const tot = this.total;
    const localOrder: LocalOrder = {
      localId,
      tempNumber,
      items: this.cart.map(i => ({
        productId: i.product.id,
        quantity: i.quantity,
        productName: i.product.name,
        unitPrice: i.product.price,
        subtotal: i.subtotal
      })),
      subtotal: st,
      tax: tx,
      discount: dc,
      total: tot,
      paymentMethod: this.paymentMethod,
      customerId: this.selectedCustomer?.id,
      customerName: this.selectedCustomer?.name,
      pointsToRedeem: this.pointsToRedeem > 0 ? this.pointsToRedeem : undefined,
      createdAt: new Date().toISOString(),
      deviceId: this.localStore.getDeviceId(),
      syncStatus: 'pending'
    };
    await this.localStore.init();
    await this.localStore.saveLocalOrder(localOrder);
    this.completedOrder = null;
    this.completedLocalOrder = localOrder;
    this.loading = false;
    this.snackBar.open('Order saved offline. Will sync when back online.', 'Close', { duration: 4000 });
    this.clearCartAfterOrder();
    this.offlineSync.triggerSync();
  }

  private clearCartAfterOrder(): void {
    this.cart = [];
    this.lastAddedProduct = null;
    if (this.currentProductBannerTimer) {
      clearTimeout(this.currentProductBannerTimer);
      this.currentProductBannerTimer = null;
    }
    this.selectedCustomer = null;
    this.discount = 0;
    this.pointsToRedeem = 0;
  }

  newOrder(): void {
    this.completedOrder = null;
    this.completedLocalOrder = null;
    this.lastAddedProduct = null;
  }

  printReceipt(): void {
    if (this.completedOrder) {
      this.printServerReceipt();
    } else if (this.completedLocalOrder) {
      this.printOfflineReceipt();
    }
  }

  private printServerReceipt(): void {
    if (!this.completedOrder) return;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      this.snackBar.open('Allow popups to print receipt', 'Close', { duration: 3000 });
      return;
    }
    const c = this.company;
    const o = this.completedOrder;
    const widthClass = (c?.receiptPaperSize === '58mm') ? 'receipt-58' : (c?.receiptPaperSize === 'A4') ? 'receipt-a4' : 'receipt-80';
    w.document.write(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt #${o.id}</title>
<style>
  body { font-family: monospace; margin: 0; padding: 12px; }
  .receipt-58 { max-width: 58mm; }
  .receipt-80 { max-width: 80mm; }
  .receipt-a4 { max-width: 210mm; }
  .company-name { font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 8px; }
  .company-detail { font-size: 0.85em; text-align: center; color: #444; margin: 2px 0; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
  .footer { text-align: center; margin-top: 12px; font-size: 0.9em; }
</style></head><body class="${widthClass}">
  <div class="company-name">${c?.name || 'Receipt'}</div>
  ${c?.address ? `<div class="company-detail">${c.address}</div>` : ''}
  ${c?.phone ? `<div class="company-detail">${c.phone}</div>` : ''}
  ${c?.receiptHeaderText ? `<div class="company-detail">${c.receiptHeaderText}</div>` : ''}
  <div style="margin: 8px 0; border-bottom: 1px dashed #000;"></div>
  <div>Order #${o.id}</div>
  ${(o.items || []).map((i: { productName: string; quantity: number; subtotal: number }) =>
    `<div class="row"><span>${i.productName} x${i.quantity}</span><span>${formatCurrency(Number(i.subtotal), c?.displayCurrency || 'USD', c?.locale)}</span></div>`
  ).join('')}
  <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(o.subtotal), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Tax</span><span>${formatCurrency(Number(o.tax), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  ${(o.discount || 0) > 0 ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(o.discount), c?.displayCurrency || 'USD', c?.locale)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatCurrency(Number(o.total), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Payment</span><span>${o.paymentMethod || ''}</span></div>
  ${c?.receiptFooterText ? `<div class="footer">${c.receiptFooterText}</div>` : ''}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  }

  private printOfflineReceipt(): void {
    const o = this.completedLocalOrder;
    if (!o) return;
    const c = this.company;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      this.snackBar.open('Allow popups to print receipt', 'Close', { duration: 3000 });
      return;
    }
    const widthClass = (c?.receiptPaperSize === '58mm') ? 'receipt-58' : (c?.receiptPaperSize === 'A4') ? 'receipt-a4' : 'receipt-80';
    w.document.write(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${o.tempNumber}</title>
<style>
  body { font-family: monospace; margin: 0; padding: 12px; }
  .receipt-58 { max-width: 58mm; }
  .receipt-80 { max-width: 80mm; }
  .receipt-a4 { max-width: 210mm; }
  .company-name { font-weight: bold; font-size: 1.1em; text-align: center; margin-bottom: 8px; }
  .company-detail { font-size: 0.85em; text-align: center; color: #444; margin: 2px 0; }
  .row { display: flex; justify-content: space-between; margin: 4px 0; }
  .total { font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000; }
  .footer { text-align: center; margin-top: 12px; font-size: 0.9em; }
  .offline-badge { background: #ff9800; color: #fff; padding: 2px 6px; font-size: 0.8em; }
</style></head><body class="${widthClass}">
  <div class="company-name">${c?.name || 'Receipt'}</div>
  <div class="offline-badge">OFFLINE - Pending sync</div>
  ${c?.address ? `<div class="company-detail">${c.address}</div>` : ''}
  ${c?.phone ? `<div class="company-detail">${c.phone}</div>` : ''}
  <div style="margin: 8px 0; border-bottom: 1px dashed #000;"></div>
  <div>Order ${o.tempNumber}</div>
  ${(o.items || []).map((i: { productName?: string; quantity: number; subtotal?: number }) =>
    `<div class="row"><span>${i.productName || 'Item'} x${i.quantity}</span><span>${formatCurrency(Number(i.subtotal || 0), c?.displayCurrency || 'USD', c?.locale)}</span></div>`
  ).join('')}
  <div class="row"><span>Subtotal</span><span>${formatCurrency(Number(o.subtotal), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Tax</span><span>${formatCurrency(Number(o.tax), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  ${(o.discount || 0) > 0 ? `<div class="row"><span>Discount</span><span>-${formatCurrency(Number(o.discount), c?.displayCurrency || 'USD', c?.locale)}</span></div>` : ''}
  <div class="row total"><span>TOTAL</span><span>${formatCurrency(Number(o.total), c?.displayCurrency || 'USD', c?.locale)}</span></div>
  <div class="row"><span>Payment</span><span>${o.paymentMethod || ''}</span></div>
  ${c?.receiptFooterText ? `<div class="footer">${c.receiptFooterText}</div>` : ''}
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 250);
  }

  displayCustomer(customer: CustomerResponse | null): string {
    return customer?.name || '';
  }

  /** Display currency code for templates (POS, receipt). */
  get currencyCode(): string {
    return this.company?.displayCurrency || 'USD';
  }
}
