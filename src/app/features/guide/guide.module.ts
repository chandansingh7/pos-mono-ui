import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { SharedModule } from '../../shared/shared.module';
import { GuideComponent } from './guide.component';

const routes: Routes = [
  { path: '', component: GuideComponent }
];

@NgModule({
  declarations: [GuideComponent],
  imports: [SharedModule, MatTabsModule, RouterModule.forChild(routes)]
})
export class GuideModule {}

