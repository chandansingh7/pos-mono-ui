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
}

export interface OpenShiftRequest {
  openingFloat: number;
}

export interface CloseShiftRequest {
  countedCash: number;
}

