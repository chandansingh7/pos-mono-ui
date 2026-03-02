import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { GuideComponent } from './guide.component';

const routes: Routes = [
  { path: '', component: GuideComponent }
];

@NgModule({
  declarations: [GuideComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class GuideModule {}

