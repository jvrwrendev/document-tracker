import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/hooks/useToast';
import {
  SERVICE_CATEGORIES,
  type ServiceCategory,
  type ServiceRequest,
  type ServiceRequestInput,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
} from '@/ticketing/types';

const EMPTY_FORM: ServiceRequestInput = {
  requesterName: '',
  requesterOffice: '',
  category: SERVICE_CATEGORIES[0],
  description: '',
  priority: 'medium',
  status: 'pending',
  assignedPersonnel: '',
};

interface ServiceRequestFormModalProps {
  open: boolean;
  onClose: () => void;
  request?: ServiceRequest | null;
  nextReference: string;
  onSave: (input: ServiceRequestInput, id?: string) => void;
}

export function ServiceRequestFormModal({
  open,
  onClose,
  request,
  nextReference,
  onSave,
}: ServiceRequestFormModalProps) {
  const toast = useToast();
  const [form, setForm] = useState<ServiceRequestInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceRequestInput, string>>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setErrors({});
    if (request) {
      setForm({
        requesterName: request.requesterName,
        requesterOffice: request.requesterOffice,
        category: request.category,
        description: request.description,
        priority: request.priority,
        status: request.status,
        assignedPersonnel: request.assignedPersonnel === 'Unassigned' ? '' : request.assignedPersonnel,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, request]);

  const title = request ? 'Edit Service Request' : 'Create Service Request';
  const reference = request?.referenceNumber ?? nextReference;

  const validate = useMemo(() => {
    const next: Partial<Record<keyof ServiceRequestInput, string>> = {};
    if (!form.requesterName.trim()) next.requesterName = 'Requester name is required';
    if (!form.requesterOffice.trim()) next.requesterOffice = 'Requester office is required';
    if (!form.description.trim()) next.description = 'Description is required';
    else if (form.description.trim().length < 10) next.description = 'Description must be at least 10 characters';
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
      requesterName: form.requesterName.trim(),
      requesterOffice: form.requesterOffice.trim(),
      description: form.description.trim(),
      assignedPersonnel: form.assignedPersonnel.trim() || 'Unassigned',
    }, request?.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`Reference ${reference}. Fields marked with * are required.`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={handleSubmit}>
            {request ? 'Save Changes' : 'Create Request'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Reference Number"
          value={reference}
          disabled
          className="font-mono"
        />
        <Input
          label="Assigned Personnel"
          value={form.assignedPersonnel}
          onChange={e => setForm(prev => ({ ...prev, assignedPersonnel: e.target.value }))}
          placeholder="e.g., Juan Dela Cruz"
          hint="Leave blank if not yet assigned."
        />
        <Input
          label="Requester Name"
          required
          value={form.requesterName}
          onChange={e => setForm(prev => ({ ...prev, requesterName: e.target.value }))}
          error={submitted ? errors.requesterName : undefined}
          placeholder="e.g., Maria Santos"
        />
        <Input
          label="Requester Office"
          required
          value={form.requesterOffice}
          onChange={e => setForm(prev => ({ ...prev, requesterOffice: e.target.value }))}
          error={submitted ? errors.requesterOffice : undefined}
          placeholder="e.g., City Treasurer’s Office"
        />
        <Select
          label="Service Category"
          required
          value={form.category}
          onChange={e => setForm(prev => ({ ...prev, category: e.target.value as ServiceCategory }))}
          options={SERVICE_CATEGORIES.map(category => ({ value: category, label: category }))}
        />
        <Select
          label="Priority"
          value={form.priority}
          onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as ServiceRequestPriority }))}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={e => setForm(prev => ({ ...prev, status: e.target.value as ServiceRequestStatus }))}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            required
            rows={4}
            value={form.description}
            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            error={submitted ? errors.description : undefined}
            placeholder="Describe the service needed…"
          />
        </div>
      </div>
    </Modal>
  );
}
