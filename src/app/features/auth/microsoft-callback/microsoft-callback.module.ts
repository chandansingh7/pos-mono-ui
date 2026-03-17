import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { MicrosoftCallbackComponent } from './microsoft-callback.component';

const routes: Routes = [
  { path: 'microsoft-callback', component: MicrosoftCallbackComponent }
];

@NgModule({
  declarations: [MicrosoftCallbackComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MicrosoftCallbackModule {}
