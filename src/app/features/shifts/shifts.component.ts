import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShiftService } from '../../core/services/shift.service';
import { ShiftResponse } from '../../core/models/shift.models';

@Component({
  selector: 'app-shifts',
  templateUrl: './shifts.component.html',
  styleUrls: ['./shifts.component.scss']
})
export class ShiftsComponent implements OnInit {
  loading = false;
  currentShift: ShiftResponse | null = null;

  openForm: FormGroup;
  closeForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private shiftService: ShiftService,
    private snackBar: MatSnackBar
  ) {
    this.openForm = this.fb.group({
      openingFloat: [0, [Validators.required, Validators.min(0)]]
    });
    this.closeForm = this.fb.group({
      countedCash: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.currentShift = null;
    this.shiftService.getCurrent().subscribe({
      next: res => {
        this.currentShift = res.data ?? null;
        if (this.currentShift) {
          this.closeForm.patchValue({ countedCash: this.currentShift.expectedCash ?? 0 });
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  openShift(): void {
    if (this.openForm.invalid) return;
    this.loading = true;
    this.shiftService.open(this.openForm.value).subscribe({
      next: res => {
        this.currentShift = res.data ?? null;
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
        this.currentShift = res.data ?? null;
        this.snackBar.open('Shift closed & reconciled', 'Close', { duration: 4000 });
        this.loading = false;
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to close shift', 'Close', { duration: 4000 });
        this.loading = false;
      }
    });
  }
}

