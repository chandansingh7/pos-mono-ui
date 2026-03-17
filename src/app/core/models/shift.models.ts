export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface ShiftResponse {
  id: number;
  cashierUsername: string;
  openingFloat: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  status: ShiftStatus;
  openedAt: string;
  closedAt?: string;
  /** True when the shift was opened offline and not yet synced to the server. */
  isOffline?: boolean;
}

export interface OpenShiftRequest {
  openingFloat: number;
}

export interface CloseShiftRequest {
  countedCash: number;
}

export interface ShiftListResponse {
  openCount: number;
  shifts: ShiftResponse[];
}

