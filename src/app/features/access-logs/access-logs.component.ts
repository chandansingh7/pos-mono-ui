import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AccessLogService } from '../../core/services/access-log.service';
import { AllowedIpService } from '../../core/services/allowed-ip.service';
import { AuthService } from '../../core/services/auth.service';
import { BlockedIpService } from '../../core/services/blocked-ip.service';
import { AccessLogResponse, AccessLogSummaryResponse, UserIpUsageResponse } from '../../core/models/access-log.models';

export type AccessLogViewMode = 'summary' | 'raw';

@Component({
  selector: 'app-access-logs',
  templateUrl: './access-logs.component.html',
  styleUrls: ['./access-logs.component.scss']
})
export class AccessLogsComponent implements OnInit {
  logs: AccessLogResponse[] = [];
  summaryRows: AccessLogSummaryResponse[] = [];
  ips: UserIpUsageResponse[] = [];
  allowedIps: string[] = [];
  blockedIps: string[] = [];
  currentClientIp: string | null = null;
  loading = false;
  ipsLoading = false;

  page = 0;
  size = 20;
  totalElements = 0;

  usernameFilter = '';
  selectedUsernameForIps = '';
  viewMode: AccessLogViewMode = 'summary';

  displayedColumns = ['username', 'ipAddress', 'country', 'action', 'path', 'createdAt'];
  summaryColumns = ['username', 'ipAddress', 'country', 'requestCount', 'lastAction', 'lastWhen'];

  constructor(
    private accessLogService: AccessLogService,
    private allowedIpService: AllowedIpService,
    private authService: AuthService,
    private blockedIpService: BlockedIpService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadView();
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

  loadSummary(page: number = this.page): void {
    this.loading = true;
    this.page = page;
    this.accessLogService.getSummary(this.page, this.size, this.usernameFilter).subscribe({
      next: res => {
        const data = res.data;
        this.summaryRows = data?.content ?? [];
        this.totalElements = data?.totalElements ?? 0;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadView(page: number = this.page): void {
    if (this.viewMode === 'summary') {
      this.loadSummary(page);
    } else {
      this.load(page);
    }
  }

  onViewModeChange(mode: AccessLogViewMode): void {
    this.viewMode = mode;
    this.page = 0;
    this.loadView(0);
  }

  onFilterChange(): void {
    this.page = 0;
    this.loadView(0);
  }

  /** Normalize IP by stripping port (e.g. "24.28.169.48:57706" -> "24.28.169.48") so allow list matches by host. */
  normalizeIp(ipAddress: string): string {
    const s = (ipAddress || '').trim();
    const match = s.match(/^(.+):(\d+)$/);
    return match ? match[1] : s;
  }

  isAllowed(ipAddress: string): boolean {
    const normalized = this.normalizeIp(ipAddress);
    return this.allowedIps.some(a => this.normalizeIp(a) === normalized);
  }

  isBlocked(ipAddress: string): boolean {
    const normalized = this.normalizeIp(ipAddress);
    return this.blockedIps.some(b => this.normalizeIp(b) === normalized);
  }

  onRowClicked(row: AccessLogResponse): void {
    if (!row || !row.username) return;
    this.viewIps(row.username);
  }

  onSummaryRowClicked(row: AccessLogSummaryResponse): void {
    if (!row || !row.username) return;
    this.viewIps(row.username);
  }

  /** True if this IP is the current user's own client IP (cannot block it). */
  isOwnCurrentIp(ipAddress: string): boolean {
    const currentUsername = this.authService.getUsername();
    if (!currentUsername || this.selectedUsernameForIps !== currentUsername || !this.currentClientIp) return false;
    return this.normalizeIp(ipAddress) === this.normalizeIp(this.currentClientIp);
  }

  viewIps(username: string): void {
    this.selectedUsernameForIps = username;
    this.ipsLoading = true;
    this.ips = [];
    this.allowedIps = [];
    this.blockedIps = [];
    this.currentClientIp = null;
    this.authService.getClientIp().subscribe({
      next: res => { this.currentClientIp = res.data ?? null; },
      error: () => { this.currentClientIp = null; }
    });
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
    this.blockedIpService.getBlockedIps(username).subscribe({
      next: res => { this.blockedIps = res.data ?? []; },
      error: () => { this.blockedIps = []; }
    });
  }

  blockThisIp(ipAddress: string): void {
    const username = this.selectedUsernameForIps;
    if (!username || !ipAddress?.trim()) return;
    const normalized = this.normalizeIp(ipAddress);
    this.blockedIpService.addBlockedIp(username, normalized).subscribe({
      next: res => {
        this.blockedIps = res.data ?? [];
        this.snackBar.open('IP added to block list. User will be logged out from this IP.', 'Close', { duration: 4000 });
      },
      error: err => {
        const msg = err.error?.message || err.error?.errorCode || 'Failed to block IP';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  unblockIp(ipAddress: string): void {
    const username = this.selectedUsernameForIps;
    if (!username || !ipAddress?.trim()) return;
    const normalized = this.normalizeIp(ipAddress);
    this.blockedIpService.removeBlockedIp(username, normalized).subscribe({
      next: res => {
        this.blockedIps = res.data ?? [];
        this.snackBar.open('IP removed from block list (whitelisted)', 'Close', { duration: 3000 });
      },
      error: err => {
        const msg = err.error?.message || err.error?.errorCode || 'Failed to unblock IP';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  addToAllowList(ipAddress: string): void {
    const username = this.selectedUsernameForIps;
    if (!username || !ipAddress?.trim()) return;
    const normalized = this.normalizeIp(ipAddress);
    this.allowedIpService.addAllowedIp(username, normalized).subscribe({
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
    const normalized = this.normalizeIp(ipAddress);
    this.allowedIpService.removeAllowedIp(username, normalized).subscribe({
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
    this.loadView(event.pageIndex);
  }
}

