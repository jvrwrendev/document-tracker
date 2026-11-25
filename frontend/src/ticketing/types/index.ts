export type ServiceRequestStatus = 'pending' | 'in_progress' | 'completed';
export type ServiceRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export const SERVICE_CATEGORIES = [
  'Equipment Repair',
  'IT Support',
  'Facility Maintenance',
  'Transport Service',
  'Records Assistance',
  'General Service',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface ServiceRequest {
  id: string;
  referenceNumber: string;
  requesterName: string;
  requesterOffice: string;
  category: ServiceCategory;
  description: string;
  priority: ServiceRequestPriority;
  status: ServiceRequestStatus;
  assignedPersonnel: string;
  dateRequested: string;
  updatedAt: string;
}

export type ServiceRequestInput = Omit<ServiceRequest, 'id' | 'referenceNumber' | 'dateRequested' | 'updatedAt'>;

export type BorrowSlipStatus = 'pending' | 'borrowed' | 'returned' | 'overdue';

export interface BorrowSlip {
  id: string;
  referenceNumber: string;
  borrowerName: string;
  borrowerOffice: string;
  itemName: string;
  itemDetails: string;
  quantity: number;
  borrowingDate: string;
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: BorrowSlipStatus;
  releasedBy: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type BorrowSlipInput = Omit<BorrowSlip, 'id' | 'referenceNumber' | 'createdAt' | 'updatedAt'>;

export interface TicketingStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  activeBorrowSlips: number;
  overdueBorrowSlips: number;
  returnedBorrowSlips: number;
}
