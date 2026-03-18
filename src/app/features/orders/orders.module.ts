import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { OrdersComponent } from './orders.component';
import { RefundDialogComponent } from './refund-dialog.component';

const routes: Routes = [{ path: '', component: OrdersComponent }];

@NgModule({
  declarations: [OrdersComponent, RefundDialogComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class OrdersModule {}
