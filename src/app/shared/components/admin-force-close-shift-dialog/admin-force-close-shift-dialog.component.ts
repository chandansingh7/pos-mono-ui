import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftService } from '../../../core/services/shift.service';
import { CompanyService } from '../../../core/services/company.service';
import { ShiftResponse } from '../../../core/models/shift.models';

export interface AdminForceCloseShiftDialogData {
  shift: ShiftResponse;
}

@Component({
  selector: 'app-admin-force-close-shift-dialog',
  template: `
    <h2 mat-dialog-title>Force close shift</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <p class="body-text">
        Cashier: <strong>{{ data.shift.cashierUsername }}</strong><br>
        Opened at: <strong>{{ data.shift.openedAt | date:'short' }}</strong><br>
        Opening float: <strong>{{ data.shift.openingFloat | currency:currencyCode }}</strong>
      </p>
      <p class="body-text small">
        Expected cash and over/short will be computed from cash orders between the
        opening time and now using this counted amount.
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">Cancel</button>
      <button mat-raised-button color="warn" (click)="submit()" [disabled]="form.invalid || loading">
        {{ loading ? 'Closing...' : 'Force close shift' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-body {
      min-width: 340px;
    }
    .body-text {
      margin-bottom: 8px;
      font-size: 13px;
    }
    .body-text.small {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.7);
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class AdminForceCloseShiftDialogComponent {
  form: FormGroup;
  loading = false;

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private companyService: CompanyService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<AdminForceCloseShiftDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: AdminForceCloseShiftDialogData
  ) {
    const defaultCounted = data.shift.expectedCash ?? data.shift.openingFloat ?? 0;
    this.form = this.fb.group({
      countedCash: [defaultCounted, [Validators.required, Validators.min(0)]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.shiftService.forceClose(this.data.shift.id, this.form.value).subscribe({
      next: res => {
        const closed = res.data ?? null;
        this.loading = false;
        let msg = 'Shift force-closed.';
        const diff = closed?.difference ?? 0;
        const n = Number(diff);
        if (!isNaN(n)) {
          if (n === 0) {
            msg = 'Shift force-closed. Drawer matches expected cash.';
          } else {
            const abs = Math.abs(n).toFixed(2);
            msg = n > 0
              ? `Shift force-closed with overage: drawer is OVER by ${abs}.`
              : `Shift force-closed with shortage: drawer is SHORT by ${abs}.`;
          }
        }
        this.snackBar.open(msg, 'Close', { duration: 5000 });
        this.dialogRef.close(true);
      },
      error: err => {
        this.loading = false;
        const msg = err.error?.message || 'Failed to force close shift';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}

