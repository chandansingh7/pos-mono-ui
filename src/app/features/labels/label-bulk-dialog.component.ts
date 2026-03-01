import { Component, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryResponse } from '../../core/models/category.models';
import { LabelRequest } from '../../core/models/label.models';

export interface LabelBulkDialogData {
  categories: CategoryResponse[];
}

@Component({
  selector: 'app-label-bulk-dialog',
  template: `
    <h2 mat-dialog-title>Bulk Create Labels</h2>
    <p class="dialog-hint">Add multiple labels. Barcodes are auto-generated. Each row: name and price required.</p>

    <mat-dialog-content>
      <form [formGroup]="form" class="bulk-form">
        <div formArrayName="rows" class="rows-container">
          <div *ngFor="let row of rows.controls; let i = index" [formGroupName]="i" class="row-group">
            <span class="row-num">{{ i + 1 }}</span>
            <mat-form-field appearance="outline" class="field-name">
              <mat-label>Name *</mat-label>
              <input matInput formControlName="name" placeholder="Product name">
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-price">
              <mat-label>Price *</mat-label>
              <input matInput type="number" formControlName="price" min="0.01">
              <span matPrefix>$&nbsp;</span>
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-sku">
              <mat-label>SKU</mat-label>
              <input matInput formControlName="sku" placeholder="Optional">
            </mat-form-field>
            <mat-form-field appearance="outline" class="field-category">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryId">
                <mat-option [value]="null">—</mat-option>
                <mat-option *ngFor="let c of data.categories" [value]="c.id">{{ c.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-icon-button type="button" (click)="removeRow(i)" matTooltip="Remove row"
              [disabled]="rows.length <= 1">
              <mat-icon>remove_circle_outline</mat-icon>
            </button>
          </div>
        </div>
        <button mat-stroked-button type="button" (click)="addRow()" class="add-row-btn">
          <mat-icon>add</mat-icon> Add row
        </button>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!hasValidRows()">
        Create {{ validRowCount() }} labels
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-hint { font-size: 12px; color: #757575; margin: -8px 0 16px 0; }
    .bulk-form { min-width: 720px; max-height: 60vh; overflow-y: auto; }
    .rows-container { display: flex; flex-direction: column; gap: 8px; }
    .row-group {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px;
      background: #fafafa;
      border-radius: 8px;
    }
    .row-num {
      flex-shrink: 0;
      width: 24px;
      height: 40px;
      line-height: 40px;
      font-size: 12px;
      color: #757575;
    }
    .field-name { flex: 2; min-width: 140px; }
    .field-price { flex: 1; min-width: 90px; }
    .field-sku { flex: 1; min-width: 90px; }
    .field-category { flex: 1; min-width: 120px; }
    .add-row-btn { margin-top: 8px; }
  `]
})
export class LabelBulkDialogComponent {
  form: FormGroup;

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<LabelBulkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LabelBulkDialogData
  ) {
    this.form = this.fb.group({
      rows: this.fb.array([this.createRow()])
    });
  }

  createRow(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0.01)]],
      sku: [''],
      categoryId: [null]
    });
  }

  addRow(): void {
    this.rows.push(this.createRow());
  }

  removeRow(i: number): void {
    if (this.rows.length > 1) {
      this.rows.removeAt(i);
    }
  }

  validRowCount(): number {
    return this.rows.controls.filter((r) => {
      const g = r as FormGroup;
      return g.get('name')?.value?.trim() && Number(g.get('price')?.value) > 0;
    }).length;
  }

  hasValidRows(): boolean {
    return this.validRowCount() > 0;
  }

  save(): void {
    const requests: LabelRequest[] = [];
    for (const row of this.rows.controls) {
      const g = row as FormGroup;
      const name = String(g.get('name')?.value ?? '').trim();
      const price = Number(g.get('price')?.value);
      if (!name || price <= 0) continue;
      requests.push({
        name,
        price,
        sku: g.get('sku')?.value ? String(g.get('sku')?.value).trim() : undefined,
        categoryId: g.get('categoryId')?.value ?? undefined
      });
    }
    if (requests.length === 0) return;
    this.dialogRef.close(requests);
  }
}
