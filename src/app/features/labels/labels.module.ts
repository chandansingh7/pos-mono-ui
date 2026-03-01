import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../shared/shared.module';
import { LabelsComponent } from './labels.component';
import { LabelDialogComponent } from './label-dialog.component';
import { AddAsProductDialogComponent } from './add-as-product-dialog.component';

const routes: Routes = [{ path: '', component: LabelsComponent }];

@NgModule({
  declarations: [
    LabelsComponent,
    LabelDialogComponent,
    AddAsProductDialogComponent
  ],
  imports: [SharedModule, MatTabsModule, RouterModule.forChild(routes)]
})
export class LabelsModule {}
