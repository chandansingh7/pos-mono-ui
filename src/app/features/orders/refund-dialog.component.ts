import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OrderItemResponse } from '../../core/models/order.models';

export interface RefundDialogData {
  orderId: number;
  orderTotal: number;
  currencyCode: string;
  items: OrderItemResponse[];
}

export interface RefundDialogResult {
  confirmed: boolean;
  reason: string;
  items: Array<{ orderItemId: number; quantity: number }>;
}

@Component({
  selector: 'app-refund-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;color:#9c27b0;margin-right:8px">currency_exchange</mat-icon>
      Refund Order #{{ data.orderId }}
    </h2>
    <mat-dialog-content>
      <p style="margin-top:0">
        Select items and quantities to refund. Leave all at full quantity for a full refund.
        <strong style="color:#d32f2f">This action cannot be undone.</strong>
      </p>

      <table class="refund-items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Refund Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of data.items; let i = index">
            <td>{{ item.productName }}</td>
            <td>{{ item.quantity }}<span *ngIf="(item.refundedQuantity || 0) > 0" class="refunded-hint"> ({{ item.refundedQuantity }} refunded)</span></td>
            <td>
              <mat-form-field appearance="outline" class="qty-field" subscriptSizing="dynamic">
                <input matInput type="number" [min]="0" [max]="maxRefundableQty(item)" [step]="0.01"
                       [(ngModel)]="refundQtys[i]" (ngModelChange)="onQtyChange()">
              </mat-form-field>
            </td>
            <td>{{ itemRefundAmount(i) | currency:data.currencyCode }}</td>
          </tr>
        </tbody>
      </table>

      <div class="refund-summary" *ngIf="totalRefundAmount > 0">
        <strong>Refund total: {{ totalRefundAmount | currency:data.currencyCode }}</strong>
      </div>

      <mat-form-field appearance="outline" subscriptSizing="dynamic" floatLabel="always" style="width:100%; margin-top:12px">
        <mat-label>Reason (optional)</mat-label>
        <textarea matInput [formControl]="reasonCtrl" rows="2"
          placeholder="e.g. Customer changed mind, defective item..."></textarea>
        <mat-hint align="end">{{ reasonCtrl.value?.length || 0 }}/500</mat-hint>
        <mat-error *ngIf="reasonCtrl.hasError('maxlength')">Maximum 500 characters</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="warn" (click)="confirm()"
              [disabled]="reasonCtrl.invalid || totalRefundAmount <= 0">
        <mat-icon>currency_exchange</mat-icon> Confirm Refund
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .refund-items-table {
      width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0;
    }
    .refund-items-table th, .refund-items-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #eee; }
    .refund-items-table th { background: #f5f5f5; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #666; }
    .qty-field { width: 80px; }
    .qty-field .mat-mdc-form-field-subscript-wrapper { display: none; }
    .refund-summary { margin-top: 10px; padding: 8px; background: #f3e5f5; border-radius: 6px; }
    .refunded-hint { color: #666; font-size: 11px; }
  `]
})
export class RefundDialogComponent {
  reasonCtrl = new FormControl('', [Validators.maxLength(500)]);
  refundQtys: number[] = [];
  totalRefundAmount = 0;

  maxRefundableQty(item: OrderItemResponse): number {
    const total = Number(item.quantity) || 0;
    const refunded = Number(item.refundedQuantity) || 0;
    return Math.max(0, total - refunded);
  }

  constructor(
    public dialogRef: MatDialogRef<RefundDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RefundDialogData
  ) {
    this.refundQtys = (data.items || []).map(i => this.maxRefundableQty(i));
    this.onQtyChange();
  }

  onQtyChange(): void {
    this.totalRefundAmount = 0;
    (this.data.items || []).forEach((item, i) => {
      const maxQty = this.maxRefundableQty(item);
      const qty = Math.min(Math.max(0, Number(this.refundQtys[i]) || 0), maxQty);
      this.refundQtys[i] = qty;
      this.totalRefundAmount += (Number(item.unitPrice) || 0) * qty;
    });
    this.totalRefundAmount = Math.round(this.totalRefundAmount * 100) / 100;
  }

  itemRefundAmount(i: number): number {
    const item = this.data.items?.[i];
    const maxQty = item ? this.maxRefundableQty(item) : 0;
    const qty = Math.min(Math.max(0, Number(this.refundQtys[i]) || 0), maxQty);
    return (Number(item?.unitPrice) || 0) * qty;
  }

  confirm(): void {
    if (this.reasonCtrl.invalid || this.totalRefundAmount <= 0) return;
    const items = (this.data.items || [])
      .map((item, i) => ({ orderItemId: item.id, quantity: Math.min(Math.max(0, this.refundQtys[i] || 0), this.maxRefundableQty(item)) }))
      .filter(x => x.quantity > 0);
    const hasPriorRefunds = (this.data.items || []).some(i => (i.refundedQuantity || 0) > 0);
    const isFullRemaining = !hasPriorRefunds && items.length === (this.data.items?.length || 0)
      && items.every((x, i) => x.quantity >= this.maxRefundableQty(this.data.items![i]));
    this.dialogRef.close({
      confirmed: true,
      reason: this.reasonCtrl.value ?? '',
      items: isFullRemaining ? [] : items  // empty = full refund (only when no prior partial refunds)
    } as RefundDialogResult);
  }

  cancel(): void {
    this.dialogRef.close({ confirmed: false, reason: '', items: [] } as RefundDialogResult);
  }
}
