import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { RewardsComponent } from './rewards.component';

const routes: Routes = [
  { path: '', component: RewardsComponent }
];

@NgModule({
  declarations: [RewardsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class RewardsModule {}
