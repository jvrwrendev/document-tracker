import { useMemo } from 'react';
import type { BorrowSlip, ServiceRequest, TicketingStats } from '@/ticketing/types';
import { effectiveBorrowStatus } from '@/ticketing/data/format';

export function useTicketingStats(
  serviceRequests: ServiceRequest[],
  borrowSlips: BorrowSlip[],
): TicketingStats {
  return useMemo(() => {
    const statusCount = (status: ServiceRequest['status']) =>
      serviceRequests.filter(request => request.status === status).length;
    const borrowStatusCount = (slip: BorrowSlip, status: string) =>
      effectiveBorrowStatus(slip) === status;
    return {
      totalRequests: serviceRequests.length,
      pendingRequests: statusCount('pending'),
      inProgressRequests: statusCount('in_progress'),
      completedRequests: statusCount('completed'),
      activeBorrowSlips: borrowSlips.filter(slip => borrowStatusCount(slip, 'borrowed') || borrowStatusCount(slip, 'overdue')).length,
      overdueBorrowSlips: borrowSlips.filter(slip => borrowStatusCount(slip, 'overdue')).length,
      returnedBorrowSlips: borrowSlips.filter(slip => borrowStatusCount(slip, 'returned')).length,
    };
  }, [serviceRequests, borrowSlips]);
}
