import { PageResponse } from './api.models';

export interface AccessLogResponse {
  id: number;
  username: string;
  ipAddress: string;
  country?: string;
  userAgent?: string;
  path: string;
  createdAt: string;
}

export interface UserIpUsageResponse {
  ipAddress: string;
  country?: string;
  count: number;
  lastUsedAt?: string;
}

export type AccessLogPage = PageResponse<AccessLogResponse>;

