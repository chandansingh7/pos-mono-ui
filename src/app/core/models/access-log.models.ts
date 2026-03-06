import { PageResponse } from './api.models';

export interface AccessLogResponse {
  id: number;
  username: string;
  ipAddress: string;
  country?: string;
  userAgent?: string;
  path: string;
  /** Human-friendly description, e.g. "Create order". */
  action?: string;
  createdAt: string;
}

/** One row per (username, normalized IP) for the summary view. */
export interface AccessLogSummaryResponse {
  username: string;
  ipAddress: string;
  country?: string;
  requestCount: number;
  lastAction?: string;
  lastPath?: string;
  lastWhen?: string;
}

export interface UserIpUsageResponse {
  ipAddress: string;
  country?: string;
  count: number;
  lastUsedAt?: string;
}

export type AccessLogPage = PageResponse<AccessLogResponse>;

