import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService, UserResponse } from '../../../core/services/user.service';
import { Role } from '../../../core/models/auth.models';

export interface EditUserDialogData {
  user: UserResponse;
  adminMode: boolean; // true = admin editing any user, false = self-service
}

@Component({
  selector: 'app-edit-user-dialog',
  templateUrl: './edit-user-dialog.component.html',
  styleUrls: ['./edit-user-dialog.component.scss']
})
export class EditUserDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  /** Shown inside modal when user clicks Save with no changes. */
  noChangesMessage = false;

  roles: { value: Role; label: string }[] = [
    { value: 'ADMIN',   label: 'Admin'   },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'CASHIER', label: 'Cashier' },
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private dialogRef: MatDialogRef<EditUserDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: EditUserDialogData
  ) {}

  ngOnInit(): void {
    const u = this.data.user;
    this.form = this.fb.group({
      firstName:       [u.firstName  || ''],
      lastName:        [u.lastName   || ''],
      email:           [u.email,       [Validators.required, Validators.email]],
      phone:           [u.phone       || ''],
      address:         [u.address     || ''],
      deliveryAddress: [u.deliveryAddress || ''],
      ...(this.data.adminMode ? {
        role:   [u.role,   Validators.required],
        active: [u.active],
      } : {})
    });
    this.form.valueChanges.subscribe(() => {
      if (this.form.dirty) this.noChangesMessage = false;
    });
  }

  submit(): void {
    this.noChangesMessage = false;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (this.form.pristine) {
      this.noChangesMessage = true;
      return;
    }

    this.loading = true;
    const v = this.form.value;
    const call$ = this.data.adminMode
      ? this.userService.adminUpdate(this.data.user.id, {
          firstName:       v.firstName       || null,
          lastName:        v.lastName        || null,
          email:           v.email,
          phone:           v.phone           || null,
          address:         v.address         || null,
          deliveryAddress: v.deliveryAddress || null,
          role:            v.role,
          active:          v.active,
        })
      : this.userService.updateMe({
          firstName:       v.firstName       || null,
          lastName:        v.lastName        || null,
          email:           v.email,
          phone:           v.phone           || null,
          address:         v.address         || null,
          deliveryAddress: v.deliveryAddress || null,
        });

    call$.subscribe({
      next: res => {
        this.loading = false;
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(res.data);
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(err.error?.message || 'Update failed', 'Close', { duration: 4000 });
      }
    });
  }

  getError(field: string, label: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.touched) return '';
    if (ctrl.hasError('required')) return `${label} is required`;
    if (ctrl.hasError('email'))    return 'Invalid email format';
    if (ctrl.hasError('maxlength')) {
      return `${label} is too long`;
    }
    return '';
  }
}
