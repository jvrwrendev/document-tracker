import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatDateTime } from '@/ticketing/data/format';
import { ServiceRequestPriorityBadge, ServiceRequestStatusBadge } from './StatusBadges';
import type { ServiceRequest, ServiceRequestStatus } from '@/ticketing/types';
import { useEffect, useState } from 'react';

interface ServiceRequestDetailModalProps {
  request: ServiceRequest | null;
  onClose: () => void;
  onStatusChange: (id: string, status: ServiceRequestStatus) => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 sm:text-right">{children}</span>
    </div>
  );
}

export function ServiceRequestDetailModal({ request, onClose, onStatusChange }: ServiceRequestDetailModalProps) {
  const [status, setStatus] = useState<ServiceRequestStatus>('pending');

  useEffect(() => {
    if (request) setStatus(request.status);
  }, [request]);

  if (!request) return null;
  const currentStatus = status;
  return (
    <Modal
      open={!!request}
      onClose={onClose}
      title={request.referenceNumber}
      description="Service request details"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={() => {
              onStatusChange(request.id, currentStatus);
              onClose();
            }}
            disabled={currentStatus === request.status}
          >
            Update Status
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <ServiceRequestStatusBadge status={request.status} />
          <ServiceRequestPriorityBadge priority={request.priority} />
        </div>
        <div>
          <DetailRow label="Requester">{request.requesterName}</DetailRow>
          <DetailRow label="Office">{request.requesterOffice}</DetailRow>
          <DetailRow label="Category">{request.category}</DetailRow>
          <DetailRow label="Assigned Personnel">{request.assignedPersonnel || 'Unassigned'}</DetailRow>
          <DetailRow label="Date Requested">{formatDateTime(request.dateRequested)}</DetailRow>
          <DetailRow label="Last Updated">{formatDateTime(request.updatedAt)}</DetailRow>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
          <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {request.description}
          </p>
        </div>
        <Select
          label="Update Status"
          value={currentStatus}
          onChange={e => setStatus(e.target.value as ServiceRequestStatus)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </div>
    </Modal>
  );
}
