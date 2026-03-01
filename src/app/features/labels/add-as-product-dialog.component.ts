import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LabelResponse } from '../../core/models/label.models';

export interface AddAsProductDialogData {
  label: LabelResponse;
}

@Component({
  selector: 'app-add-as-product-dialog',
  template: `
    <h2 mat-dialog-title>Add as Product</h2>
    <mat-dialog-content>
      <p class="dialog-message">
        Create a product from label "{{ data.label.name }}" and add it to inventory.
      </p>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Initial Stock</mat-label>
          <input matInput type="number" formControlName="initialStock" min="0">
          <mat-error>Must be 0 or greater</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary" (click)="confirm()" [disabled]="form.invalid">
        Add as Product
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-message { margin-bottom: 16px; color: #616161; }
    .dialog-form { min-width: 280px; }
    .full-width { width: 100%; }
  `]
})
export class AddAsProductDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddAsProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddAsProductDialogData
  ) {
    this.form = this.fb.group({
      initialStock: [0, [Validators.required, Validators.min(0)]]
    });
  }

  confirm(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value.initialStock);
  }
}
