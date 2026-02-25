import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ProductService } from '../../core/services/product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BulkEditRowDialogComponent } from './bulk-edit-row-dialog.component';
import { validatePreviewRow, buildCsvFileFromRows } from './bulk-upload-parser.util';

export interface BulkPreviewRow {
  rowIndex: number;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  category: string;
  initialStock: string;
  lowStockThreshold: string;
  errors: string[];
  /** Set after bulk-check: true if this SKU already exists (row will update existing product). */
  skuExists?: boolean;
}

export interface BulkUploadPreviewData {
  file: File;
  rows: BulkPreviewRow[];
  fileName: string;
}

@Component({
  selector: 'app-bulk-upload-preview-modal',
  templateUrl: './bulk-upload-preview-modal.component.html',
  styleUrls: ['./bulk-upload-preview-modal.component.scss']
})
export class BulkUploadPreviewModalComponent implements OnInit {
  displayedColumns = ['rowIndex', 'name', 'sku', 'price', 'category', 'initialStock', 'lowStockThreshold', 'errors', 'actions'];
  dataSource = new MatTableDataSource<BulkPreviewRow>([]);
  uploading = false;
  checkingSkus = false;

  get isValid(): boolean {
    return this.data.rows.length > 0 && this.data.rows.every(r => r.errors.length === 0);
  }

  get totalRows(): number {
    return this.data.rows.length;
  }

  get errorCount(): number {
    return this.data.rows.filter(r => r.errors.length > 0).length;
  }

  get updateCount(): number {
    return this.data.rows.filter(r => r.skuExists).length;
  }

  constructor(
    private dialogRef: MatDialogRef<BulkUploadPreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BulkUploadPreviewData,
    private productService: ProductService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.dataSource.data = this.data.rows;
  }

  ngOnInit(): void {
    this.loadExistingSkus();
  }

  refreshTable(): void {
    this.dataSource.data = [...this.data.rows];
  }

  loadExistingSkus(): void {
    const skus = this.data.rows
      .map(r => (r.sku || '').trim())
      .filter(s => s.length > 0);
    if (skus.length === 0) return;
    this.checkingSkus = true;
    this.productService.bulkCheckSkus(skus).subscribe({
      next: res => {
        this.checkingSkus = false;
        const existingSet = new Set((res.data || []) as string[]);
        this.data.rows.forEach(r => {
          (r as BulkPreviewRow).skuExists = existingSet.has((r.sku || '').trim());
          // Re-validate now that we know whether this SKU already exists.
          r.errors = validatePreviewRow(r);
        });
        this.refreshTable();
      },
      error: () => { this.checkingSkus = false; }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  deleteRow(row: BulkPreviewRow): void {
    const idx = this.data.rows.indexOf(row);
    if (idx === -1) return;
    this.data.rows.splice(idx, 1);
    this.renumberRows();
    this.refreshTable();
  }

  editRow(row: BulkPreviewRow): void {
    this.dialog.open(BulkEditRowDialogComponent, {
      width: '420px',
      data: { row: { ...row } },
      disableClose: false
    }).afterClosed().subscribe((updated: BulkPreviewRow | null) => {
      if (!updated) return;
      const idx = this.data.rows.findIndex(r => r === row);
      if (idx === -1) return;
      updated.errors = validatePreviewRow(updated);
      updated.rowIndex = row.rowIndex;
      this.data.rows[idx] = updated;
      this.refreshTable();
      this.loadExistingSkus();
    });
  }

  private renumberRows(): void {
    this.data.rows.forEach((r, i) => { r.rowIndex = i + 1; });
  }

  upload(): void {
    if (!this.isValid) return;
    this.uploading = true;
    const file = buildCsvFileFromRows(this.data.rows, this.data.fileName || 'bulk-upload.csv');
    this.productService.bulkUpload(file).subscribe({
      next: res => {
        this.uploading = false;
        const d = res.data;
        if (d) {
          const updated = d.updatedCount ?? 0;
          const parts = [`${d.successCount} created`];
          if (updated > 0) parts.push(`${updated} updated`);
          parts.push(`${d.failCount} failed`);
          const msg = `Bulk upload: ${parts.join(', ')}.`;
          this.snackBar.open(msg, 'Close', { duration: d.failCount ? 5000 : 3000 });
          if (d.errors?.length) {
            const details = d.errors.slice(0, 5).map(e => `Row ${e.row}: ${e.message}`).join('; ');
            this.snackBar.open(details, 'Close', { duration: 8000 });
          }
        }
        this.dialogRef.close(true);
      },
      error: () => {
        this.uploading = false;
        this.snackBar.open('Bulk upload failed', 'Close', { duration: 4000 });
      }
    });
  }
}
