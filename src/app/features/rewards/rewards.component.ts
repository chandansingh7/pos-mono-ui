import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomerService } from '../../core/services/customer.service';
import { RewardService } from '../../core/services/reward.service';
import { CompanyService } from '../../core/services/company.service';
import { CustomerResponse } from '../../core/models/customer.models';
import { MemberCardDialogComponent } from '../../shared/components/member-card-dialog/member-card-dialog.component';

@Component({
  selector: 'app-rewards',
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.scss']
})
export class RewardsComponent implements OnInit {
  config: { pointsPerDollar: number; redemptionRate: number } | null = null;
  customers: CustomerResponse[] = [];
  loading = false;

  displayedColumns = ['name', 'email', 'rewardPoints', 'redemptionValue', 'card'];

  constructor(
    private rewardService: RewardService,
    private customerService: CustomerService,
    private companyService: CompanyService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  get currencyCode(): string {
    return this.companyService.getCached()?.displayCurrency || 'USD';
  }

  ngOnInit(): void {
    this.loading = true;
    this.rewardService.getConfig().subscribe({
      next: res => { this.config = res.data ?? null; }
    });
    this.customerService.getAll('', 0, 500).subscribe({
      next: res => {
        this.customers = res.data?.content ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  redemptionValue(points: number): number {
    if (!this.config || this.config.redemptionRate <= 0) return 0;
    return points / this.config.redemptionRate;
  }

  openMemberCard(customer: CustomerResponse): void {
    const openDialog = (c: CustomerResponse) => {
      this.dialog.open(MemberCardDialogComponent, { data: { customer: c }, width: '380px' })
        .afterClosed().subscribe(() => this.ngOnInit());
    };
    if (customer.memberCardBarcode) {
      openDialog(customer);
    } else {
      this.customerService.createMemberCard(customer.id).subscribe({
        next: res => { if (res.data) openDialog(res.data); else this.snackBar.open('Could not create card', 'Close', { duration: 3000 }); },
        error: err => this.snackBar.open(err.error?.message || 'Error', 'Close', { duration: 4000 })
      });
    }
  }
}
