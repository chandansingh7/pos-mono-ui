import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SharedModule } from '../../shared/shared.module';
import { ProductsComponent } from './products.component';
import { ProductDialogComponent } from './product-dialog.component';
import { BulkUploadPreviewModalComponent } from './bulk-upload-preview-modal.component';
import { BulkEditRowDialogComponent } from './bulk-edit-row-dialog.component';

const routes: Routes = [{ path: '', component: ProductsComponent }];

@NgModule({
  declarations: [ProductsComponent, ProductDialogComponent, BulkUploadPreviewModalComponent, BulkEditRowDialogComponent],
  imports: [SharedModule, MatProgressBarModule, RouterModule.forChild(routes)]
})
export class ProductsModule {}
