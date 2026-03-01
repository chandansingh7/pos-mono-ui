import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { ProductResponse } from '../../core/models/product.models';
import { LabelResponse } from '../../core/models/label.models';
import { ApiResponse, PageResponse } from '../../core/models/api.models';

export interface LabelAttachProductDialogData {
  label: LabelResponse;
}

@Component({
  selector: 'app-label-attach-product-dialog',
  template: `
    <h2 mat-dialog-title>Attach Label to Product</h2>

    <mat-dialog-content class="dialog-body">
      <div class="label-summary">
        <div class="label-name">{{ data.label.name }}</div>
        <div class="label-meta">
          <span>Barcode: <strong>{{ data.label.barcode }}</strong></span>
          <span *ngIf="data.label.price !== undefined && data.label.price !== null">
            Price: {{ data.label.price }}
          </span>
        </div>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Search product by name, SKU, or barcode</mat-label>
        <input
          matInput
          [formControl]="searchControl"
          [matAutocomplete]="auto"
          placeholder="Start typing to search products"
        />
        <mat-icon matPrefix>search</mat-icon>
      </mat-form-field>

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onProductSelected($event.option.value)">
        <mat-option *ngFor="let p of products" [value]="p">
          <div class="product-option">
            <div class="line-main">{{ p.name }}</div>
            <div class="line-meta">
              <span>SKU: {{ p.sku || '—' }}</span>
              <span>Barcode: {{ p.barcode || '—' }}</span>
            </div>
          </div>
        </mat-option>
        <mat-option *ngIf="!loading && products.length === 0 && searchControl.value">
          No products found for "{{ searchControl.value }}".
        </mat-option>
      </mat-autocomplete>

      <div *ngIf="selectedProduct" class="selection-summary">
        <div class="selection-title">Selected product</div>
        <div class="selection-name">{{ selectedProduct.name }}</div>
        <div class="selection-meta">
          <span>SKU: {{ selectedProduct.sku || '—' }}</span>
          <span>Barcode: {{ selectedProduct.barcode || '—' }}</span>
        </div>
        <mat-hint *ngIf="!hasBarcodeConflict">
          {{ selectedProduct.barcode ? 'Barcode already matches or will be aligned with this label.' :
          'Product has no barcode — it will be set to this label’s barcode.' }}
        </mat-hint>
        <mat-error *ngIf="hasBarcodeConflict">
          Product already has a different barcode ({{ selectedProduct.barcode }}).
        </mat-error>
        <mat-checkbox *ngIf="hasBarcodeConflict" [formControl]="forceOverride">
          Overwrite product barcode with this label’s barcode
        </mat-checkbox>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="confirm()"
        [disabled]="!selectedProduct || (hasBarcodeConflict && !forceOverride.value)"
      >
        Attach
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-body {
        min-width: 520px;
      }
      .label-summary {
        margin-bottom: 12px;
      }
      .label-name {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 4px;
      }
      .label-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #616161;
      }
      .full-width {
        width: 100%;
      }
      .product-option .line-main {
        font-weight: 500;
      }
      .product-option .line-meta {
        font-size: 11px;
        color: #757575;
        display: flex;
        gap: 12px;
      }
      .selection-summary {
        margin-top: 12px;
        padding: 8px 10px;
        border-radius: 4px;
        background: #fafafa;
      }
      .selection-title {
        font-size: 12px;
        color: #757575;
        margin-bottom: 2px;
      }
      .selection-name {
        font-weight: 500;
        margin-bottom: 2px;
      }
      .selection-meta {
        font-size: 12px;
        color: #616161;
        display: flex;
        gap: 12px;
      }
    `,
  ],
})
export class LabelAttachProductDialogComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  forceOverride = new FormControl(false);
  products: ProductResponse[] = [];
  selectedProduct: ProductResponse | null = null;
  loading = false;

  private subs = new Subscription();

  constructor(
    private productService: ProductService,
    public dialogRef: MatDialogRef<LabelAttachProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LabelAttachProductDialogData
  ) {}

  get hasBarcodeConflict(): boolean {
    if (!this.selectedProduct) return false;
    const productBarcode = (this.selectedProduct.barcode || '').trim();
    const labelBarcode = (this.data.label.barcode || '').trim();
    if (!productBarcode || !labelBarcode) return false;
    return productBarcode !== labelBarcode;
  }

  ngOnInit(): void {
    const sub = this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          const value = (term || '').toString().trim();
          if (!value) {
            this.products = [];
            return [];
          }
          this.loading = true;
          return this.productService.getAll(value, undefined, 0, 10, 'name,asc');
        })
      )
      .subscribe((res: any) => {
        if (!res || !('data' in res)) {
          this.loading = false;
          return;
        }
        const apiRes = res as ApiResponse<PageResponse<ProductResponse>>;
        this.products = apiRes.data?.content || [];
        this.loading = false;
      });

    this.subs.add(sub as any);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onProductSelected(product: ProductResponse): void {
    this.selectedProduct = product;
  }

  confirm(): void {
    if (!this.selectedProduct) return;
    const force = !!this.forceOverride.value;
    if (this.hasBarcodeConflict && !force) return;
    this.dialogRef.close({ productId: this.selectedProduct.id, force });
  }
}

