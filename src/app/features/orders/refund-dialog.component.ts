import { Component, Inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RefundDialogData {
  orderId: number;
  orderTotal: number;
  currencyCode: string;
}

export interface RefundDialogResult {
  confirmed: boolean;
  reason: string;
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
        This will refund
        <strong>{{ data.orderTotal | currency:data.currencyCode }}</strong>
        and restore inventory to stock.
        <strong style="color:#d32f2f">This action cannot be undone.</strong>
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Reason (optional)</mat-label>
        <textarea matInput [formControl]="reasonCtrl" rows="3"
          placeholder="e.g. Customer changed mind, defective item..."></textarea>
        <mat-hint align="end">{{ reasonCtrl.value?.length || 0 }}/500</mat-hint>
        <mat-error *ngIf="reasonCtrl.hasError('maxlength')">Maximum 500 characters</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="cancel()">Cancel</button>
      <button mat-flat-button color="warn" (click)="confirm()" [disabled]="reasonCtrl.invalid">
        <mat-icon>currency_exchange</mat-icon> Confirm Refund
      </button>
    </mat-dialog-actions>
  `
})
export class RefundDialogComponent {
  reasonCtrl = new FormControl('', [Validators.maxLength(500)]);

  constructor(
    public dialogRef: MatDialogRef<RefundDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RefundDialogData
  ) {}

  confirm(): void {
    if (this.reasonCtrl.invalid) return;
    this.dialogRef.close({ confirmed: true, reason: this.reasonCtrl.value ?? '' } as RefundDialogResult);
  }

  cancel(): void {
    this.dialogRef.close({ confirmed: false, reason: '' } as RefundDialogResult);
  }
}
