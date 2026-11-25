import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import { toDateInput } from '@/ticketing/data/format';
import type { BorrowSlip, BorrowSlipInput, BorrowSlipStatus } from '@/ticketing/types';

const EMPTY_FORM: BorrowSlipInput = {
  borrowerName: '',
  borrowerOffice: '',
  itemName: '',
  itemDetails: '',
  quantity: 1,
  borrowingDate: new Date().toISOString(),
  expectedReturnDate: new Date().toISOString(),
  actualReturnDate: null,
  status: 'pending',
  releasedBy: '',
  remarks: '',
};

function toIsoDate(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toISOString();
}

interface BorrowSlipFormModalProps {
  open: boolean;
  onClose: () => void;
  slip?: BorrowSlip | null;
  nextReference: string;
  onSave: (input: BorrowSlipInput, id?: string) => void;
}

export function BorrowSlipFormModal({ open, onClose, slip, nextReference, onSave }: BorrowSlipFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<BorrowSlipInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof BorrowSlipInput, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setErrors({});
    if (slip) {
      setForm({
        borrowerName: slip.borrowerName,
        borrowerOffice: slip.borrowerOffice,
        itemName: slip.itemName,
        itemDetails: slip.itemDetails,
        quantity: slip.quantity,
        borrowingDate: slip.borrowingDate,
        expectedReturnDate: slip.expectedReturnDate,
        actualReturnDate: slip.actualReturnDate,
        status: slip.status,
        releasedBy: slip.releasedBy === 'Unassigned' ? '' : slip.releasedBy,
        remarks: slip.remarks,
      });
    } else {
      setForm({ ...EMPTY_FORM, borrowingDate: new Date().toISOString(), expectedReturnDate: new Date().toISOString() });
    }
  }, [open, slip]);

  const reference = slip?.referenceNumber ?? nextReference;

  const validate = useMemo(() => {
    const next: Partial<Record<keyof BorrowSlipInput, string>> = {};
    if (!form.borrowerName.trim()) next.borrowerName = 'Borrower name is required';
    if (!form.borrowerOffice.trim()) next.borrowerOffice = 'Borrower office is required';
    if (!form.itemName.trim()) next.itemName = 'Item name is required';
    if (!form.quantity || form.quantity < 1) next.quantity = 'Quantity must be at least 1';
    if (!form.borrowingDate) next.borrowingDate = 'Borrowing date is required';
    if (!form.expectedReturnDate) next.expectedReturnDate = 'Expected return date is required';
    if (
      form.borrowingDate && form.expectedReturnDate &&
      new Date(form.expectedReturnDate).getTime() < new Date(form.borrowingDate).getTime()
    ) next.expectedReturnDate = 'Expected return must be on or after borrowing date';
    return next;
  }, [form]);

  const handleSubmit = () => {
    setSubmitted(true);
    setErrors(validate);
    if (Object.keys(validate).length > 0) {
      toast.error('Please check the form', 'Some required fields are missing or invalid.');
      return;
    }
    onSave({
      ...form,
      borrowerName: form.borrowerName.trim(),
      borrowerOffice: form.borrowerOffice.trim(),
      itemName: form.itemName.trim(),
      itemDetails: form.itemDetails.trim(),
      releasedBy: form.releasedBy.trim() || 'Unassigned',
      remarks: form.remarks.trim(),
      borrowingDate: toIsoDate(toDateInput(form.borrowingDate)) ?? form.borrowingDate,
      expectedReturnDate: toIsoDate(toDateInput(form.expectedReturnDate)) ?? form.expectedReturnDate,
      actualReturnDate: form.actualReturnDate ? toIsoDate(toDateInput(form.actualReturnDate)) : null,
    }, slip?.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={slip ? 'Edit Borrow Slip' : 'Create Borrow Slip'}
      description={`Reference ${reference}. Fields marked with * are required.`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={handleSubmit}>
            {slip ? 'Save Changes' : 'Create Slip'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Reference Number" value={reference} disabled className="font-mono" />
        <Input
          label="Quantity"
          type="number"
          min={1}
          value={form.quantity}
          onChange={e => setForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
          error={submitted ? errors.quantity : undefined}
        />
        <Input
          label="Borrower Name"
          required
          value={form.borrowerName}
          onChange={e => setForm(prev => ({ ...prev, borrowerName: e.target.value }))}
          error={submitted ? errors.borrowerName : undefined}
        />
        <Input
          label="Borrower Office"
          required
          value={form.borrowerOffice}
          onChange={e => setForm(prev => ({ ...prev, borrowerOffice: e.target.value }))}
          error={submitted ? errors.borrowerOffice : undefined}
        />
        <Input
          label="Item / Equipment"
          required
          value={form.itemName}
          onChange={e => setForm(prev => ({ ...prev, itemName: e.target.value }))}
          error={submitted ? errors.itemName : undefined}
          className="sm:col-span-2"
        />
        <Input
          label="Item Details"
          value={form.itemDetails}
          onChange={e => setForm(prev => ({ ...prev, itemDetails: e.target.value }))}
          placeholder="Serial number, accessories, condition…"
          className="sm:col-span-2"
        />
        <Input
          label="Borrowing Date"
          required
          type="date"
          value={toDateInput(form.borrowingDate)}
          onChange={e => setForm(prev => ({ ...prev, borrowingDate: toIsoDate(e.target.value) ?? '' }))}
          error={submitted ? errors.borrowingDate : undefined}
        />
        <Input
          label="Expected Return Date"
          required
          type="date"
          value={toDateInput(form.expectedReturnDate)}
          onChange={e => setForm(prev => ({ ...prev, expectedReturnDate: toIsoDate(e.target.value) ?? '' }))}
          error={submitted ? errors.expectedReturnDate : undefined}
        />
        <Input
          label="Actual Return Date"
          type="date"
          value={toDateInput(form.actualReturnDate)}
          onChange={e => setForm(prev => ({ ...prev, actualReturnDate: e.target.value ? toIsoDate(e.target.value) : null }))}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={e => setForm(prev => ({ ...prev, status: e.target.value as BorrowSlipStatus }))}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'borrowed', label: 'Borrowed' },
            { value: 'returned', label: 'Returned' },
            { value: 'overdue', label: 'Overdue' },
          ]}
        />
        <Input
          label="Released By"
          value={form.releasedBy}
          onChange={e => setForm(prev => ({ ...prev, releasedBy: e.target.value }))}
          placeholder="e.g., Rosa Mendoza"
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Remarks"
            rows={3}
            value={form.remarks}
            onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))}
            placeholder="Optional notes…"
          />
        </div>
      </div>
    </Modal>
  );
}
