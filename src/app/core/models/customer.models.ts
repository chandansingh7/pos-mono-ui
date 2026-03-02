export interface CustomerRequest {
  name: string;
  email?: string;
  phone?: string;
}

export interface CustomerResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  rewardPoints?: number;
  memberCardBarcode?: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
