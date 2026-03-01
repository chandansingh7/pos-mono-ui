import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../shared/shared.module';
import { LabelsComponent } from './labels.component';
import { LabelDialogComponent } from './label-dialog.component';
import { LabelBulkDialogComponent } from './label-bulk-dialog.component';
import { LabelAttachProductDialogComponent } from './label-attach-product-dialog.component';
import { AddAsProductDialogComponent } from './add-as-product-dialog.component';

const routes: Routes = [{ path: '', component: LabelsComponent }];

@NgModule({
  declarations: [
    LabelsComponent,
    LabelDialogComponent,
    LabelAttachProductDialogComponent,
    LabelBulkDialogComponent,
    AddAsProductDialogComponent
  ],
  imports: [SharedModule, MatTabsModule, RouterModule.forChild(routes)]
})
export class LabelsModule {}
