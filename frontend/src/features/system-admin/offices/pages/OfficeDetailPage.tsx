import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  Edit2,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { officeService, ApiError } from '@/features/system-admin/offices/services/office.service';
import { OfficeFormModal } from '@/features/system-admin/offices/components/OfficeFormModal';
import type {
  CreateOfficeInput,
  Office,
} from '@/features/system-admin/offices/types/office';
import { formatDate } from '@/lib/utils';

interface OfficeEmployee {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  position: string;
}

export function OfficeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();

  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadOffice = async (officeId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setOffice(await officeService.getById(officeId));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to load office.';
      setLoadError(message);
      setOffice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void loadOffice(id);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const handleInvalidation = () => {
      void loadOffice(id);
    };
    window.addEventListener('employees:invalidate', handleInvalidation);
    window.addEventListener('users:invalidate', handleInvalidation);
    return () => {
      window.removeEventListener('employees:invalidate', handleInvalidation);
      window.removeEventListener('users:invalidate', handleInvalidation);
    };
  }, [id]);

  const handleDelete = async () => {
    if (!office) return;
    const ok = await confirm({
      title: 'Delete Office',
      description: `Permanently delete ${office.name}? Associated user accounts will not be deleted. They will become Unassigned and can be reassigned later; their roles, credentials, and history remain intact.`,
      confirmText: 'Delete Office',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleteLoading(true);
    try {
      await officeService.remove(office.id);
      toast.success(
        'Office deleted',
        `${office.name} has been removed. Associated users are now Unassigned.`,
      );
      navigate('/offices');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete office.';
      toast.error('Delete failed', message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditSubmit = async (input: CreateOfficeInput) => {
    if (!office) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const updated = await officeService.update(office.id, input);
      setOffice(updated);
      toast.success(
        'Office updated',
        `${updated.code} — ${updated.name} has been saved.`,
      );
      setEditOpen(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update office.';
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Link to="/offices" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Offices
        </Link>
        <Card>
          <div className="py-12 text-center text-sm text-slate-500">
            Loading office…
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !office) {
    return (
      <div className="space-y-4">
        <Link to="/offices" className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Offices
        </Link>
        <Card>
          <div className="py-8 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-medium mt-3">Office not found</p>
            <p className="text-xs text-slate-500 mt-1">
              {loadError ?? "The office you're looking for may have been removed or doesn't exist."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/offices')}>
              Back to Offices
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const employees: OfficeEmployee[] = Array.isArray(
    (office as unknown as { employees?: OfficeEmployee[] }).employees,
  )
    ? ((office as unknown as { employees: OfficeEmployee[] }).employees)
    : [];

  const fullName = (e: OfficeEmployee) =>
    [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');

  const headName = office.headName ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/offices"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Offices
        </Link>
      </div>

      <PageHeader
        title={office.name}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Offices', to: '/offices' },
          { label: office.name },
        ]}
        actions={
          <>
            {hasPermission('offices.edit') && (
              <Button
                variant="outline"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => {
                  setEditError(null);
                  setEditOpen(true);
                }}
                disabled={deleteLoading}
              >
                Edit Office
              </Button>
            )}
            {hasPermission('offices.delete') && (
              <Button
                variant="outline"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleDelete}
                disabled={deleteLoading}
                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              >
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </>
        }
      />

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{office.code}</span>
              <span className="text-slate-300">·</span>
              <span>Created {formatDate(office.createdAt)}</span>
              {!office.isActive && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-amber-600 font-medium">Inactive</span>
                </>
              )}
            </div>
            <span
              className={
                'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ' +
                (office.type === 'main'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : office.type === 'division'
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-white text-slate-600 border-slate-200')
              }
            >
              {office.type}
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
          <MetaField label="Office Head" value={headName} />
          <MetaField label="Employees" value={<span className="tabular-nums">{employees.length}</span>} />
        </div>

        {office.description && (
          <div className="px-5 pb-5 -mt-1">
            <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
              {office.description}
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Assigned Employees</h3>
              <span className="text-xs text-slate-500 tabular-nums">{employees.length}</span>
            </div>
            {employees.length === 0 ? (
              <p className="text-sm text-slate-500 px-5 py-8 text-center">
                No employees are currently assigned to this office.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {employees.map(emp => {
                  const name = fullName(emp);
                  return (
                    <li key={emp.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={name} color="bg-slate-600" size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.position}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Head</h3>
            </div>
            <div className="px-5 py-4 flex items-center gap-3">
              <Avatar name={headName} color="bg-slate-700" size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{headName}</p>
                <p className="text-xs text-slate-500">Office head</p>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            </div>
            <dl className="px-5 py-4 divide-y divide-slate-100 text-sm">
              <Row label="Type" value={<span className="capitalize">{office.type}</span>} />
              <Row label="Code" value={<span className="font-mono">{office.code}</span>} />
              <Row label="Created" value={formatDate(office.createdAt)} />
            </dl>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Snapshot</h3>
            </div>
            <ul className="px-5 py-4 space-y-2 text-xs">
              <SnapshotRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={formatDate(office.createdAt)} />
              <SnapshotRow icon={<FileText className="w-3.5 h-3.5" />} label="Documents" value="—" />
            </ul>
          </Card>

          {!office.description && (
            <Card>
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p>
                  No description has been provided for this office yet.
                </p>
              </div>
            </Card>
          )}
        </aside>
      </div>

      <OfficeFormModal
        open={editOpen}
        mode="edit"
        initial={office}
        loading={editLoading}
        errorMessage={editError}
        onClose={() => {
          if (editLoading) return;
          setEditOpen(false);
          setEditError(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </p>
      <div className="text-sm font-semibold text-slate-900 mt-1 truncate">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900 truncate text-right">{value}</dd>
    </div>
  );
}

function SnapshotRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <li className="flex items-center gap-2 text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span className="uppercase tracking-wider text-[10px] font-semibold text-slate-500">
        {label}
      </span>
      <span className="ml-auto font-semibold text-slate-900 tabular-nums">{value}</span>
    </li>
  );
}
