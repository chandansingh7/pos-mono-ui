import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BackupComponent } from './backup.component';

const routes: Routes = [{ path: '', component: BackupComponent }];

@NgModule({
  declarations: [BackupComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class BackupModule {}
