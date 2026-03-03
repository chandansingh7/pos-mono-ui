import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftService } from '../../../core/services/shift.service';
import { ShiftResponse } from '../../../core/models/shift.models';

@Component({
  selector: 'app-start-shift-dialog',
  template: `
    <h2 mat-dialog-title>Start shift</h2>
    <mat-dialog-content [formGroup]="form" class="dialog-body">
      <p class="body-text">
        Record the opening float (cash in drawer) before taking cash payments.
      </p>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="full-width">
        <mat-label>Opening float (cash in drawer)</mat-label>
        <input matInput type="number" formControlName="openingFloat" min="0" step="0.01" placeholder="e.g. 100">
        <mat-hint>Example: 100 if you put \$100 in the drawer for change.</mat-hint>
        <mat-error *ngIf="form.get('openingFloat')?.hasError('required')">
          Opening float is required.
        </mat-error>
        <mat-error *ngIf="form.get('openingFloat')?.hasError('min')">
          Amount cannot be negative.
        </mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid || loading">
        {{ loading ? 'Starting...' : 'Start shift' }}
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
export class StartShiftDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<StartShiftDialogComponent, ShiftResponse | null>
  ) {
    this.form = this.fb.group({
      openingFloat: [0, [Validators.required, Validators.min(0)]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.shiftService.open(this.form.value).subscribe({
      next: res => {
        const shift = res.data ?? null;
        this.loading = false;
        this.snackBar.open('Shift opened', 'Close', { duration: 3000 });
        this.dialogRef.close(shift || null);
      },
      error: err => {
        this.loading = false;
        const msg = err.error?.message || 'Failed to open shift';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }
}

