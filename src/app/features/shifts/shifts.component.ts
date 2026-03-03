import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftService } from '../../core/services/shift.service';
import { AuthService } from '../../core/services/auth.service';
import { ShiftResponse } from '../../core/models/shift.models';

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.scss']
})
export class ShiftsComponent implements OnInit {
  loading = false;
  currentShift: ShiftResponse | null = null;
  errorMessage: string | null = null;
  shiftList: ShiftResponse[] = [];
  openCount = 0;
  listLoading = false;

  openForm: FormGroup;
  closeForm: FormGroup;
  displayedColumns = ['cashier', 'openedAt', 'closedAt', 'openingFloat', 'cashSales', 'expectedCash', 'countedCash', 'difference', 'status'];

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.openForm = this.fb.group({
      openingFloat: [0, [Validators.required, Validators.min(0)]]
    });
    this.closeForm = this.fb.group({
      countedCash: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get isManagerPlus(): boolean {
    return this.authService.isAdminOrManager();
  }

  ngOnInit(): void {
    this.refresh();
    if (this.isManagerPlus) this.loadOverview();
  }

  loadOverview(): void {
    this.listLoading = true;
    this.shiftService.list(0, 50).subscribe({
      next: res => {
        const data = res.data;
        if (data) {
          this.openCount = data.openCount ?? 0;
          this.shiftList = data.shifts ?? [];
        }
        this.listLoading = false;
      },
      error: () => { this.listLoading = false; }
    });
  }

  refresh(): void {
    this.loading = true;
    this.currentShift = null;
    this.errorMessage = null;
    this.shiftService.getCurrent().subscribe({
      next: res => {
        this.currentShift = res.data ?? null;
        if (this.currentShift) {
          this.closeForm.patchValue({ countedCash: this.currentShift.expectedCash ?? 0 });
        }
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        const status = err.status;
        const code = err.error?.errorCode;
        const msg = err.error?.message;
        if (status === 404 || (code === 'OR001' && msg?.toLowerCase().includes('shift'))) {
          this.currentShift = null;
        } else {
          this.errorMessage = msg || 'Could not load shift. Ensure your account exists in Settings → Users.';
        }
      }
    });
  }

  openShift(): void {
    if (this.openForm.invalid) return;
    this.loading = true;
    this.shiftService.open(this.openForm.value).subscribe({
      next: res => {
        this.currentShift = res.data ?? null;
        if (this.isManagerPlus) this.loadOverview();
        this.snackBar.open('Shift opened', 'Close', { duration: 3000 });
        this.loading = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to open shift', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }

  closeShift(): void {
    if (this.closeForm.invalid) return;
    this.loading = true;
    this.shiftService.close(this.closeForm.value).subscribe({
      next: res => {
        const closed = res.data ?? null;
        let message = 'Shift closed.';

        if (closed && closed.difference !== undefined && closed.difference !== null) {
          const diff = Number(closed.difference);
          if (!isNaN(diff)) {
            if (diff === 0) {
              message = 'Shift closed. Drawer matches expected cash.';
            } else {
              const abs = Math.abs(diff).toFixed(2);
              message = diff > 0
                ? `Shift closed with overage: drawer is OVER by ${abs}.`
                : `Shift closed with shortage: drawer is SHORT by ${abs}.`;
            }
          }
        }

        // Shift is now closed — treat as no active shift and refresh overview
        this.currentShift = null;
        this.closeForm.reset({ countedCash: 0 });
        if (this.isManagerPlus) this.loadOverview();
        this.snackBar.open(message, 'Close', { duration: 5000 });
        this.loading = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to close shift', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }
}

