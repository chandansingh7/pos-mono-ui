import { Component, OnInit } from '@angular/core';
import { CustomerService } from '../../core/services/customer.service';
import { RewardService } from '../../core/services/reward.service';
import { CustomerResponse } from '../../core/models/customer.models';

@Component({
  selector: 'app-rewards',
  templateUrl: './rewards.component.html',
  styleUrls: ['./rewards.component.scss']
})
export class RewardsComponent implements OnInit {
  config: { pointsPerDollar: number; redemptionRate: number } | null = null;
  customers: CustomerResponse[] = [];
  loading = false;

  displayedColumns = ['name', 'email', 'rewardPoints', 'redemptionValue'];

  constructor(
    private rewardService: RewardService,
    private customerService: CustomerService
  ) {}

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
}
