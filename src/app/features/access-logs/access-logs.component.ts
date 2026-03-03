import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { AccessLogService } from '../../core/services/access-log.service';
import { AccessLogResponse, UserIpUsageResponse } from '../../core/models/access-log.models';

@Component({
  selector: 'app-access-logs',
  templateUrl: './access-logs.component.html',
  styleUrls: ['./access-logs.component.scss']
})
export class AccessLogsComponent implements OnInit {
  logs: AccessLogResponse[] = [];
  ips: UserIpUsageResponse[] = [];
  loading = false;
  ipsLoading = false;

  page = 0;
  size = 20;
  totalElements = 0;

  usernameFilter = '';
  selectedUsernameForIps = '';

  displayedColumns = ['username', 'ipAddress', 'country', 'path', 'createdAt'];

  constructor(private accessLogService: AccessLogService) {}

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

  viewIps(username: string): void {
    this.selectedUsernameForIps = username;
    this.ipsLoading = true;
    this.accessLogService.getUserIps(username).subscribe({
      next: res => {
        this.ips = res.data ?? [];
        this.ipsLoading = false;
      },
      error: () => { this.ipsLoading = false; }
    });
  }

  onPageChange(event: PageEvent): void {
    this.size = event.pageSize;
    this.load(event.pageIndex);
  }
}

