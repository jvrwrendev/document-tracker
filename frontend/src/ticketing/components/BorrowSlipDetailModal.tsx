import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatDateTime, formatDateOnly, effectiveBorrowStatus } from '@/ticketing/data/format';
import { BorrowSlipStatusBadge } from './StatusBadges';
import type { BorrowSlip } from '@/ticketing/types';

interface BorrowSlipDetailModalProps {
  slip: BorrowSlip | null;
  onClose: () => void;
  onReturn: (id: string) => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2.5 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800 sm:text-right">{children}</span>
    </div>
  );
}

export function BorrowSlipDetailModal({ slip, onClose, onReturn }: BorrowSlipDetailModalProps) {
  if (!slip) return null;
  const status = effectiveBorrowStatus(slip);
  const canReturn = status !== 'returned';
  return (
    <Modal
      open={!!slip}
      onClose={onClose}
      title={slip.referenceNumber}
      description="Borrow slip details"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            disabled={!canReturn}
            onClick={() => {
              onReturn(slip.id);
              onClose();
            }}
          >
            {canReturn ? 'Mark as Returned' : 'Already Returned'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <BorrowSlipStatusBadge status={status} />
        <div>
          <DetailRow label="Borrower">{slip.borrowerName}</DetailRow>
          <DetailRow label="Office">{slip.borrowerOffice}</DetailRow>
          <DetailRow label="Item">{slip.itemName}</DetailRow>
          <DetailRow label="Details">{slip.itemDetails || '—'}</DetailRow>
          <DetailRow label="Quantity">{slip.quantity}</DetailRow>
          <DetailRow label="Borrowing Date">{formatDateOnly(slip.borrowingDate)}</DetailRow>
          <DetailRow label="Expected Return">{formatDateOnly(slip.expectedReturnDate)}</DetailRow>
          <DetailRow label="Actual Return">{formatDateOnly(slip.actualReturnDate)}</DetailRow>
          <DetailRow label="Released By">{slip.releasedBy || 'Unassigned'}</DetailRow>
          <DetailRow label="Created">{formatDateTime(slip.createdAt)}</DetailRow>
        </div>
        {slip.remarks && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Remarks</p>
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{slip.remarks}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
