import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { AccessLogsComponent } from './access-logs.component';

const routes: Routes = [{ path: '', component: AccessLogsComponent }];

@NgModule({
  declarations: [AccessLogsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class AccessLogsModule {}

