import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProductResponse } from '../../core/models/product.models';
import { CompanyService } from '../../core/services/company.service';

export interface PrintLabelsBulkDialogData {
  products: ProductResponse[];
}

export interface PrintableItemWithCount {
  product: ProductResponse;
  count: number;
}

@Component({
  selector: 'app-print-labels-bulk-dialog',
  templateUrl: './print-labels-bulk-dialog.component.html',
  styleUrls: ['./print-labels-bulk-dialog.component.scss']
})
export class PrintLabelsBulkDialogComponent {
  form: FormGroup;
  products: ProductResponse[];

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    public dialogRef: MatDialogRef<PrintLabelsBulkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PrintLabelsBulkDialogData
  ) {
    this.products = data.products ?? [];
    const controls: Record<string, unknown> = {};
    this.products.forEach((p, i) => {
      controls[`count_${p.id}`] = [1, [Validators.required, Validators.min(1)]];
    });
    this.form = this.fb.group(controls);
  }

  getCount(product: ProductResponse): number {
    const ctrl = this.form.get(`count_${product.id}`);
    const v = ctrl?.value;
    return typeof v === 'number' && !isNaN(v) ? Math.max(1, Math.floor(v)) : 1;
  }

  exceedsQuantity(product: ProductResponse): boolean {
    const qty = typeof product.quantity === 'number' ? product.quantity : 0;
    return this.getCount(product) > qty;
  }

  hasAnyExceedsQuantity(): boolean {
    return this.products.some(p => this.exceedsQuantity(p));
  }

  onPrint(): void {
    if (this.form.invalid) return;
    const items: PrintableItemWithCount[] = this.products.map(p => ({
      product: p,
      count: this.getCount(p)
    }));
    this.dialogRef.close(items);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }
}
