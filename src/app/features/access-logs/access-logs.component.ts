import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessLogService } from '../../core/services/access-log.service';
import { AllowedIpService } from '../../core/services/allowed-ip.service';
import { AccessLogResponse, UserIpUsageResponse } from '../../core/models/access-log.models';

@Component({
  selector: 'app-access-logs',
  templateUrl: './access-logs.component.html',
  styleUrls: ['./access-logs.component.scss']
})
export class AccessLogsComponent implements OnInit {
  logs: AccessLogResponse[] = [];
  ips: UserIpUsageResponse[] = [];
  allowedIps: string[] = [];
  loading = false;
  ipsLoading = false;

  page = 0;
  size = 20;
  totalElements = 0;

  usernameFilter = '';
  selectedUsernameForIps = '';

  displayedColumns = ['username', 'ipAddress', 'country', 'action', 'path', 'createdAt'];

  constructor(
    private accessLogService: AccessLogService,
    private allowedIpService: AllowedIpService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(page: number = this.page): void {
    this.loading = true;
    this.page = page;
    this.accessLogService.getAll(this.page, this.size, this.usernameFilter).subscribe({
      next: res => {
        const data = res.data;
        this.logs = data?.content ?? [];
        this.totalElements = data?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onFilterChange(): void {
    this.page = 0;
    this.load(0);
  }

  isAllowed(ipAddress: string): boolean {
    return this.allowedIps.some(a => (a || '').trim() === (ipAddress || '').trim());
  }

  viewIps(username: string): void {
    this.selectedUsernameForIps = username;
    this.ipsLoading = true;
    this.ips = [];
    this.allowedIps = [];
    this.accessLogService.getUserIps(username).subscribe({
      next: res => {
        this.ips = res.data ?? [];
        this.ipsLoading = false;
      },
      error: () => { this.ipsLoading = false; }
    });
    this.allowedIpService.getAllowedIps(username).subscribe({
      next: res => { this.allowedIps = res.data ?? []; },
      error: () => { this.allowedIps = []; }
    });
  }

  addToAllowList(ipAddress: string): void {
    const username = this.selectedUsernameForIps;
    if (!username || !ipAddress?.trim()) return;
    this.allowedIpService.addAllowedIp(username, ipAddress.trim()).subscribe({
      next: res => {
        this.allowedIps = res.data ?? [];
        this.snackBar.open('IP added to allow list', 'Close', { duration: 3000 });
      },
      error: err => {
        const msg = err.error?.message || err.error?.errorCode || 'Failed to add IP';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  removeFromAllowList(ipAddress: string): void {
    const username = this.selectedUsernameForIps;
    if (!username || !ipAddress?.trim()) return;
    this.allowedIpService.removeAllowedIp(username, ipAddress.trim()).subscribe({
      next: res => {
        this.allowedIps = res.data ?? [];
        this.snackBar.open('IP removed from allow list', 'Close', { duration: 3000 });
      },
      error: err => {
        const msg = err.error?.message || err.error?.errorCode || 'Failed to remove IP';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.size = event.pageSize;
    this.load(event.pageIndex);
  }
}

