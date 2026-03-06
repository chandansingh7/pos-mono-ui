import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../core/services/product.service';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { CompanyService } from '../../core/services/company.service';
import { RewardService } from '../../core/services/reward.service';
import { ProductResponse } from '../../core/models/product.models';
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
  company: CompanyResponse | null = null;
  private companySub?: Subscription;
  /** Scan layout: last product added (shown at top of left panel). */
  lastAddedProduct: ProductResponse | null = null;

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
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.checkShift();
    this.loadProducts();
    this.rewardService.getConfig().subscribe({
      next: res => { this.rewardConfig = res.data ?? null; }
    });
    this.company = this.companyService.getCached();
    if (!this.company) {
      this.companyService.get().subscribe({ next: res => { this.company = res.data ?? null; } });
    }
    this.companySub = this.companyService.company$.subscribe(c => { this.company = c ?? this.company; });

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
    this.productService.getAll(search, undefined, 0, 30).subscribe({
      next: res => { this.products = res.data?.content || []; this.productsLoading = false; },
      error: () => { this.productsLoading = false; }
    });
  }

  customersLoaded = false;

  loadCustomers(): void {
    if (this.customersLoaded) return;
    this.customerService.getAll('', 0, 25).subscribe({
      next: res => {
        this.customers = res.data?.content || [];
        this.customersLoaded = true;
      }
    });
  }

  ngOnDestroy(): void {
    this.companySub?.unsubscribe();
  }

  lookupBarcode(barcode: string): void {
    const tryMemberCard = () => {
      this.customerService.getByMemberCard(barcode).subscribe({
        next: res => {
          if (res.data) {
            this.selectedCustomer = res.data;
            if (!this.customers.find(c => c.id === res.data!.id)) {
              this.customers = [...this.customers, res.data];
            }
            this.barcodeControl.setValue('', { emitEvent: false });
            this.snackBar.open('Member: ' + res.data.name + ' (' + (res.data.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
          } else {
            this.snackBar.open('Product or member card not found: ' + barcode, 'Close', { duration: 3000 });
          }
        },
        error: () => this.snackBar.open('Product or member card not found: ' + barcode, 'Close', { duration: 3000 })
      });
    };
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

  /**
   * Scan layout: one field for search or barcode. Try barcode first; if not found, try member card; else filter product list.
   */
  scanInputValue(value: string): void {
    const trimmed = (value || '').trim();
    if (trimmed.length < 2) {
      this.loadProducts(trimmed);
      return;
    }
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

  private tryMemberCardThenSearch(value: string): void {
    this.customerService.getByMemberCard(value).subscribe({
      next: res => {
        if (res.data) {
          this.selectedCustomer = res.data;
          if (!this.customers.find(c => c.id === res.data!.id)) {
            this.customers = [...this.customers, res.data];
          }
          this.barcodeControl.setValue('', { emitEvent: false });
          this.snackBar.open('Member: ' + res.data.name + ' (' + (res.data.rewardPoints ?? 0) + ' pts)', 'Close', { duration: 3000 });
        } else {
          this.loadProducts(value);
        }
      },
      error: () => this.loadProducts(value)
    });
  }

  addToCart(product: ProductResponse): void {
    if (product.quantity <= 0) {
      this.snackBar.open(`${product.name} is out of stock`, 'Close', { duration: 3000 });
      return;
    }
    const existing = this.cart.find(i => i.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.quantity) {
        this.snackBar.open('Cannot add more than available stock', 'Close', { duration: 3000 });
        return;
      }
      existing.quantity++;
      existing.subtotal = existing.quantity * existing.product.price;
    } else {
      this.cart.push({ product, quantity: 1, subtotal: product.price });
    }
    if (this.isScanLayout) {
      this.lastAddedProduct = product;
    }
  }

  updateQty(item: CartItem, qty: number): void {
    if (qty <= 0) { this.removeFromCart(item); return; }
    if (qty > item.product.quantity) {
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
    }
  }

  clearCart(): void {
    this.cart = [];
    this.lastAddedProduct = null;
    this.selectedCustomer = null;
    this.discount = 0;
    this.pointsToRedeem = 0;
    this.paymentMethod = 'CASH';
    this.completedOrder = null;
  }

  get subtotal(): number {
    return this.cart.reduce((sum, i) => sum + i.subtotal, 0);
  }

  get tax(): number {
    return this.subtotal * 0.1;
  }

  get redemptionDiscount(): number {
    if (!this.rewardConfig || !this.selectedCustomer || this.pointsToRedeem <= 0) return 0;
    const rate = this.rewardConfig.redemptionRate || 100;
    return this.pointsToRedeem / rate;
  }

  get total(): number {
    return this.subtotal + this.tax - (this.discount || 0) - this.redemptionDiscount;
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
    if (this.paymentMethod === 'CASH' && !this.hasOpenShift) {
      this.snackBar.open('Open a shift on the Shifts page before taking cash payments.', 'Close', { duration: 4000 });
      return;
    }
    this.loading = true;
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
        this.loading = false;
        this.snackBar.open('Order placed successfully!', 'Close', { duration: 3000 });
        this.cart = [];
        this.lastAddedProduct = null;
        this.selectedCustomer = null;
        this.discount = 0;
        this.pointsToRedeem = 0;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to place order', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }

  newOrder(): void {
    this.completedOrder = null;
    this.lastAddedProduct = null;
  }

  printReceipt(): void {
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

  displayCustomer(customer: CustomerResponse | null): string {
    return customer?.name || '';
  }

  /** Display currency code for templates (POS, receipt). */
  get currencyCode(): string {
    return this.company?.displayCurrency || 'USD';
  }
}
