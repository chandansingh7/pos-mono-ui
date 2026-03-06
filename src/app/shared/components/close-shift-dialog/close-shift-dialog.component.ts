import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftService } from '../../../core/services/shift.service';
import { CompanyService } from '../../../core/services/company.service';
import { ShiftResponse } from '../../../core/models/shift.models';

@Component({
  selector: 'app-close-shift-dialog',
  template: `
    <h2 mat-dialog-title>Close shift &amp; reconcile</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <ng-container *ngIf="currentShift; else loadingTpl">
        <p class="body-text">
          Opening float: <strong>{{ currentShift.openingFloat | currency:currencyCode }}</strong><br>
          Cash sales: <strong>{{ (currentShift.cashSales || 0) | currency:currencyCode }}</strong><br>
          Expected cash: <strong>{{ (currentShift.expectedCash || 0) | currency:currencyCode }}</strong>
        </p>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
          <mat-label>Counted cash in drawer</mat-label>
          <input matInput type="number" formControlName="countedCash" min="0" step="0.01">
          <mat-hint>Enter the actual cash you counted in the drawer.</mat-hint>
          <mat-error *ngIf="form.get('countedCash')?.hasError('required')">
            Counted cash is required.
          </mat-error>
          <mat-error *ngIf="form.get('countedCash')?.hasError('min')">
            Amount cannot be negative.
          </mat-error>
        </mat-form-field>
      </ng-container>
      <ng-template #loadingTpl>
        <p>Loading current shift details...</p>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid || loading || !currentShift">
        {{ loading ? 'Closing...' : 'Close shift' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: 320px;
    }
    .body-text {
      margin-bottom: 12px;
      font-size: 13px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class CloseShiftDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  currentShift: ShiftResponse | null = null;

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private companyService: CompanyService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<CloseShiftDialogComponent, ShiftResponse | null>
  ) {
    this.form = this.fb.group({
      countedCash: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loading = true;
    this.shiftService.getCurrent().subscribe({
      next: res => {
        this.currentShift = res.data ?? null;
        const expected = this.currentShift?.expectedCash ?? this.currentShift?.openingFloat ?? 0;
        this.form.patchValue({ countedCash: expected });
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        const msg = err.error?.message || 'Failed to load current shift';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.dialogRef.close(null);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.shiftService.close(this.form.value).subscribe({
      next: res => {
        const closed = res.data ?? null;
        this.loading = false;
        const diff = closed?.difference ?? 0;
        let msg = 'Shift closed.';
        const n = Number(diff);
        if (!isNaN(n)) {
          if (n === 0) {
            msg = 'Shift closed. Drawer matches expected cash.';
          } else {
            const abs = Math.abs(n).toFixed(2);
            msg = n > 0
              ? `Shift closed with overage: drawer is OVER by ${abs}.`
              : `Shift closed with shortage: drawer is SHORT by ${abs}.`;
          }
        }
        this.snackBar.open(msg, 'Close', { duration: 5000 });
        this.dialogRef.close(closed || null);
      },
      error: err => {
        this.loading = false;
        const msg = err.error?.message || 'Failed to close shift';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}

