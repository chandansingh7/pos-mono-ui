import { Component, Inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoryResponse } from '../../core/models/category.models';
import { ProductResponse } from '../../core/models/product.models';
import { resolveProductImageUrl } from '../../core/utils/product-image.util';

export interface ProductDialogData {
  product?: ProductResponse;
  categories: CategoryResponse[];
}

@Component({
  selector: 'app-product-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.product ? 'Edit' : 'New' }} Product</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <!-- Image section: compact side-by-side layout -->
        <div class="image-section">
          <div class="image-row">
            <!-- Preview thumbnail -->
            <div class="image-preview" (click)="fileInput.click()" [class.has-image]="previewUrl">
              <img *ngIf="previewUrl" [src]="previewUrl" alt="Product image"
                   class="preview-img" (error)="onImageError()">
              <div *ngIf="!previewUrl" class="no-image">
                <mat-icon>add_photo_alternate</mat-icon>
                <span>Click to upload</span>
              </div>
            </div>

            <!-- Upload controls -->
            <div class="image-controls">
              <div class="image-actions">
                <button mat-stroked-button type="button" (click)="fileInput.click()">
                  <mat-icon>upload</mat-icon> {{ selectedFile ? 'Change' : 'Upload' }}
                </button>
                <button mat-icon-button type="button" color="warn" *ngIf="previewUrl"
                        (click)="clearImage()" matTooltip="Remove image">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
              <span *ngIf="selectedFile" class="file-name">{{ selectedFile.name }}</span>
              <mat-form-field appearance="outline" class="full-width url-field">
                <mat-label>Or paste image URL</mat-label>
                <input matInput formControlName="imageUrl" placeholder="https://..." (input)="onUrlInput()">
                <mat-icon matPrefix>link</mat-icon>
              </mat-form-field>
            </div>
          </div>
          <input #fileInput type="file" accept="image/jpeg,image/png,image/gif,image/webp"
            style="display:none" (change)="onFileSelected($event)">
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name *</mat-label>
          <input matInput formControlName="name">
          <mat-error>Name is required</mat-error>
        </mat-form-field>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Barcode</mat-label>
            <input matInput formControlName="barcode">
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Size</mat-label>
            <input matInput formControlName="size" placeholder="e.g. S, M, 42">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Color</mat-label>
            <input matInput formControlName="color" placeholder="e.g. Red, Blue">
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Price *</mat-label>
            <input matInput type="number" formControlName="price" min="0.01">
            <span matPrefix>$&nbsp;</span>
            <mat-error>Valid price required</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option [value]="null">— None —</mat-option>
              <mat-option *ngFor="let c of data.categories" [value]="c.id">{{ c.name }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ data.product ? 'Current Stock' : 'Initial Stock' }}</mat-label>
            <input matInput type="number" formControlName="initialStock" min="0">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Low Stock Threshold</mat-label>
            <input matInput type="number" formControlName="lowStockThreshold" min="0">
          </mat-form-field>
        </div>

        <mat-checkbox formControlName="active">Active</mat-checkbox>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">
        <mat-icon>save</mat-icon> Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Dialog content padding */
    :host ::ng-deep mat-dialog-content,
    :host ::ng-deep .mat-mdc-dialog-content,
    :host ::ng-deep .mdc-dialog__content {
      max-height: unset !important;
      overflow: hidden !important;
      padding: 8px 20px 4px !important;
    }
    :host ::ng-deep mat-dialog-actions {
      padding: 8px 20px 12px !important;
    }

    .dialog-form {
      display: flex; flex-direction: column; gap: 6px;
      padding-top: 4px;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .full-width { width: 100%; }

    /* ── Image section: preview left, controls right ── */
    .image-section {
      border: 1px solid #e0e0e0; border-radius: 8px;
      padding: 10px; background: #fafafa;
    }
    .image-row { display: flex; gap: 12px; align-items: flex-start; }

    .image-preview {
      flex-shrink: 0; width: 90px; height: 90px; border-radius: 6px;
      border: 2px dashed #bdbdbd; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; background: #fff; transition: border-color 0.2s;
    }
    .image-preview:hover { border-color: #1976d2; }
    .image-preview.has-image { border-style: solid; border-color: #e0e0e0; }
    .preview-img { width: 100%; height: 100%; object-fit: contain; }
    .no-image {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; color: #9e9e9e; font-size: 11px; text-align: center;
    }
    .no-image mat-icon { font-size: 28px; width: 28px; height: 28px; }

    .image-controls { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .image-actions { display: flex; align-items: center; gap: 6px; }
    .file-name {
      font-size: 11px; color: #616161;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .url-field { margin-top: 2px; }
  `]
})
export class ProductDialogComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  private objectUrl: string | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProductDialogData
  ) {}

  ngOnInit(): void {
    const p = this.data.product;
    this.form = this.fb.group({
      name:              [p?.name || '', Validators.required],
      sku:               [p?.sku || ''],
      barcode:           [p?.barcode || ''],
      size:              [p?.size || ''],
      color:             [p?.color || ''],
      price:             [p?.price || '', [Validators.required, Validators.min(0.01)]],
      categoryId:        [p?.categoryId || null],
      imageUrl:          [p?.imageUrl || ''],
      active:            [p?.active !== undefined ? p.active : true],
      initialStock:      [p?.quantity || 0, Validators.min(0)],
      lowStockThreshold: [10, Validators.min(0)]
    });

    if (p?.imageUrl) {
      this.previewUrl = resolveProductImageUrl(p.imageUrl) ?? p.imageUrl;
    }
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    this.revokeObjectUrl();
    this.selectedFile = file;
    this.objectUrl    = URL.createObjectURL(file);
    this.previewUrl   = this.objectUrl;
    this.form.get('imageUrl')?.setValue('', { emitEvent: false });
  }

  onUrlInput(): void {
    const url = this.form.get('imageUrl')?.value;
    if (url) {
      this.selectedFile = null;
      this.revokeObjectUrl();
      this.previewUrl = resolveProductImageUrl(url) ?? url;
    } else {
      this.previewUrl = null;
    }
  }

  clearImage(): void {
    this.selectedFile = null;
    this.revokeObjectUrl();
    this.previewUrl = null;
    this.form.get('imageUrl')?.setValue('');
  }

  /** Called when the <img> src fails to load (e.g. stale localhost URL in DB) */
  onImageError(): void {
    this.previewUrl = null;
  }

  save(): void {
    if (this.form.invalid) return;
    this.dialogRef.close({ ...this.form.value, imageFile: this.selectedFile ?? undefined });
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}
