import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryResponse } from '../../core/models/category.models';
import { LabelRequest, LabelResponse } from '../../core/models/label.models';

export interface LabelDialogData {
  label?: LabelResponse;
  categories: CategoryResponse[];
}

@Component({
  selector: 'app-label-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.label ? 'Edit' : 'Create' }} Label</h2>
    <p class="dialog-hint">Pre-print labels for new items. Add as product later when ready.</p>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Barcode *</mat-label>
          <input matInput formControlName="barcode" placeholder="e.g. 4901234560011">
          <mat-error>Barcode is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name">
          <mat-error>Name is required</mat-error>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Price *</mat-label>
            <input matInput type="number" formControlName="price" min="0.01">
            <span matPrefix>$&nbsp;</span>
            <mat-error>Valid price required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" placeholder="Optional">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option [value]="null">— None —</mat-option>
            <mat-option *ngFor="let c of data.categories" [value]="c.id">{{ c.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        {{ data.label ? 'Update' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-hint { font-size: 12px; color: #757575; margin: -8px 0 16px 0; }
    .dialog-form { display: flex; flex-direction: column; gap: 8px; min-width: 360px; }
    .full-width { width: 100%; }
    .row-2 { display: flex; gap: 16px; }
    .row-2 mat-form-field { flex: 1; }
  `]
})
export class LabelDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LabelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LabelDialogData
  ) {
    const l = data.label;
    this.form = this.fb.group({
      barcode: [l?.barcode ?? '', [Validators.required]],
      name: [l?.name ?? '', [Validators.required]],
      price: [l?.price ?? 0, [Validators.required, Validators.min(0.01)]],
      sku: [l?.sku ?? ''],
      categoryId: [l?.categoryId ?? null]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const req: LabelRequest = {
      barcode: String(v.barcode ?? '').trim(),
      name: String(v.name ?? '').trim(),
      price: Number(v.price),
      sku: v.sku ? String(v.sku).trim() : undefined,
      categoryId: v.categoryId ?? undefined
    };
    this.dialogRef.close(req);
  }
}
