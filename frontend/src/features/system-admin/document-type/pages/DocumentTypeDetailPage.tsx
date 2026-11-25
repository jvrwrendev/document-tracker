import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Clock,
  Hash,
  Tag,
  Edit2,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Power,
  PowerOff,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { useDocumentTypes } from '@/features/system-admin/document-type/hooks/useDocumentTypes';
import { ApiError } from '@/features/system-admin/document-type/services/document-type.service';
import {
  DocumentTypeCodeBadge,
  DocumentTypeFormModal,
  DocumentTypeStatusBadge,
} from '@/features/system-admin/document-type/components';
import {
  DOCUMENT_TYPE_CODES,
  DOCUMENT_TYPE_CODE_DESCRIPTIONS,
  DOCUMENT_TYPE_CODE_LABELS,
  type DocumentTypeCode,
  type DocumentTypeRecord,
  type UpdateDocumentTypePayload,
} from '@/features/system-admin/document-type/types/document-type';
import { formatDate } from '@/lib/utils';

export function DocumentTypeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { hasPermission } = useAuth();

  const { fetchById, update, remove, items, updating, deleting, actionError, clearActionError } =
    useDocumentTypes();

  const [record, setRecord] = useState<DocumentTypeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = async (recordId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setRecord(await fetchById(recordId));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to load document type.';
      setLoadError(message);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void load(id);
  }, [id]);

  const handleDelete = async () => {
    if (!record) return;
    const docCount = record._count?.documents ?? 0;
    const ok = await confirm({
      title: 'Delete Document Type',
      description:
        docCount > 0
          ? `Permanently delete "${record.name}"? It is currently used by ${docCount} document${docCount === 1 ? '' : 's'}. This action cannot be undone.`
          : `Permanently delete "${record.name}"? This action cannot be undone.`,
      confirmText: 'Delete Document Type',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await remove(record.id);
      toast.success(
        'Document type deleted',
        `${record.name} has been removed.`,
      );
      navigate('/document-types');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to delete document type.';
      toast.error('Delete failed', message);
    }
  };

  const handleEditSubmit = async (input: UpdateDocumentTypePayload) => {
    if (!record) return;
    try {
      const updated = await update(record.id, input);
      setRecord(updated);
      toast.success('Document type updated', `${updated.name} has been saved.`);
      setEditOpen(false);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error('Unexpected error', 'Please try again.');
      }
    }
  };

  const handleToggleStatus = async () => {
    if (!record) return;
    setToggling(true);
    try {
      const updated = await update(record.id, { isActive: !record.isActive });
      setRecord(updated);
      toast.success(
        updated.isActive ? 'Type activated' : 'Type deactivated',
        `${updated.name} is now ${updated.isActive ? 'active' : 'inactive'}.`,
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update status.';
      toast.error('Update failed', message);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Link
          to="/document-types"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Document Types
        </Link>
        <Card>
          <div className="py-12 text-center text-sm text-slate-500">
            Loading document type…
          </div>
        </Card>
      </div>
    );
  }

  if (loadError || !record) {
    return (
      <div className="space-y-4">
        <Link
          to="/document-types"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Document Types
        </Link>
        <Card>
          <div className="py-8 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-medium mt-3">Document type not found</p>
            <p className="text-xs text-slate-500 mt-1">
              {loadError ??
                "The document type you're looking for may have been removed or doesn't exist."}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/document-types')}
            >
              Back to Document Types
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const usageCount = record._count?.documents ?? 0;
  const existingCodes = new Map(
    items
      .filter(i => i.id !== record.id)
      .flatMap(i => i.codes.map(c => [c as DocumentTypeCode, i.id])),
  );

  const existingNames = new Map(
    items
      .filter(i => i.id !== record.id)
      .map(i => [i.name.trim().toLowerCase(), i.id]),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/document-types"
          className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Document Types
        </Link>
      </div>

      <PageHeader
        title={record.name}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Document Types', to: '/document-types' },
          { label: record.name },
        ]}
        actions={
          <>
            {hasPermission('documents.edit') && (
              <Button
                variant="outline"
                leftIcon={record.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                onClick={handleToggleStatus}
                disabled={toggling || updating || deleting}
              >
                {toggling
                  ? 'Updating…'
                  : record.isActive
                    ? 'Deactivate'
                    : 'Activate'}
              </Button>
            )}
            {hasPermission('documents.edit') && (
              <Button
                variant="outline"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={() => {
                  clearActionError();
                  setEditOpen(true);
                }}
                disabled={updating || deleting || toggling}
              >
                Edit
              </Button>
            )}
            {hasPermission('documents.delete') && (
              <Button
                variant="outline"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleDelete}
                disabled={deleting || updating || toggling}
                className="!text-rose-600 !border-rose-200 hover:!bg-rose-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </>
        }
      />

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
            {record.codes.map(code => (
              <DocumentTypeCodeBadge key={code} code={code as DocumentTypeCode} />
            ))}
            <DocumentTypeStatusBadge isActive={record.isActive} />
            <span className="text-slate-300">·</span>
            <span>Created {formatDate(record.createdAt)}</span>
            <span className="text-slate-300">·</span>
            <span>Updated {formatDate(record.updatedAt, true)}</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <MetaField
            label="Display Name"
            value={<span className="text-sm font-semibold text-slate-900">{record.name}</span>}
          />
          <MetaField
            label="Codes"
            value={
              <div className="flex flex-wrap gap-1">
                {record.codes.map(code => (
                  <span key={code} className="font-mono text-[11px] text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                    {code}
                  </span>
                ))}
              </div>
            }
          />
          <MetaField
            label="Status"
            value={<DocumentTypeStatusBadge isActive={record.isActive} />}
          />
          <MetaField
            label="Used By"
            value={
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 tabular-nums">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {usageCount} document{usageCount === 1 ? '' : 's'}
              </span>
            }
          />
        </div>

        {record.description ? (
          <div className="px-5 pb-5 -mt-1">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
              Description
            </p>
            <p className="text-sm text-slate-700 leading-relaxed max-w-3xl">
              {record.description}
            </p>
          </div>
        ) : (
          <div className="px-5 pb-5 -mt-1">
            <p className="text-xs text-slate-500 italic">No description provided.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Metadata</h3>
            </div>
            <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row
                label="Codes"
                value={
                  <div className="flex flex-wrap gap-1">
                    {record.codes.map(code => (
                      <span key={code} className="font-mono text-xs text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                }
              />
              <Row
                label="Status"
                value={<DocumentTypeStatusBadge isActive={record.isActive} />}
              />
              <Row
                label="Created"
                value={
                  <span className="text-xs text-slate-600">
                    {formatDate(record.createdAt, true)}
                  </span>
                }
              />
              <Row
                label="Updated"
                value={
                  <span className="text-xs text-slate-600">
                    {formatDate(record.updatedAt, true)}
                  </span>
                }
              />
              <Row
                label="Documents"
                value={
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                    {usageCount}
                  </span>
                }
              />
              <Row
                label="Usage Restriction"
                value={
                  <span className="text-xs text-slate-600">
                    {record.isActive
                      ? 'Available when registering new documents.'
                      : 'Hidden from new document registrations.'}
                  </span>
                }
              />
            </dl>
          </Card>

          <Card>
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Tag className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">About these codes</p>
                <ul className="text-xs text-slate-500 mt-1 space-y-1">
                  {record.codes.map(code => (
                    <li key={code}>
                      <span className="font-medium text-slate-700">{DOCUMENT_TYPE_CODE_LABELS[code]}:</span>{' '}
                      {DOCUMENT_TYPE_CODE_DESCRIPTIONS[code] ??
                        'Custom document type used to classify records.'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {usageCount > 0 && (
            <Card>
              <div className="flex items-start gap-2 text-xs text-amber-700">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p>
                  This type is currently used by{' '}
                  <span className="font-semibold">{usageCount}</span>{' '}
                  document{usageCount === 1 ? '' : 's'}. Deleting it may
                  break historical records that reference these codes.
                </p>
              </div>
            </Card>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Identity</h3>
            </div>
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {record.name}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {record.codes.map(code => (
                    <span key={code} className="text-[10px] text-slate-500 font-mono uppercase">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Reference</h3>
            </div>
            <dl className="px-5 py-4 divide-y divide-slate-100 text-sm">
              <Row
                label={<InlineIcon icon={<Hash className="w-3 h-3" />} label="ID" />}
                value={
                  <span className="font-mono text-[10px] text-slate-500 break-all">
                    {record.id}
                  </span>
                }
              />
              <Row
                label={<InlineIcon icon={<Calendar className="w-3 h-3" />} label="Created" />}
                value={<span className="text-xs text-slate-600">{formatDate(record.createdAt)}</span>}
              />
              <Row
                label={<InlineIcon icon={<Clock className="w-3 h-3" />} label="Updated" />}
                value={<span className="text-xs text-slate-600">{formatDate(record.updatedAt)}</span>}
              />
            </dl>
          </Card>

          <Card padded={false}>
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">Available Codes</h3>
            </div>
            <ul className="px-5 py-4 space-y-2 text-xs">
              {DOCUMENT_TYPE_CODES.map(code => {
                const isCurrent = record.codes.includes(code);
                return (
                  <li
                    key={code}
                    className={`flex items-center gap-2 ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}
                  >
                    <DocumentTypeCodeBadge code={code} showIcon={false} />
                    <span className="flex-1 truncate">
                      {DOCUMENT_TYPE_CODE_LABELS[code]}
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] font-semibold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded">
                        THIS
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>

      <DocumentTypeFormModal
        open={editOpen}
        mode="edit"
        initial={record}
        loading={updating}
        errorMessage={actionError}
        existingCodes={existingCodes}
        existingNames={existingNames}
        onClose={() => {
          if (updating) return;
          setEditOpen(false);
          clearActionError();
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
      <div className="mt-1 truncate">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 shrink-0">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-900 truncate text-right">
        {value}
      </dd>
    </div>
  );
}

function InlineIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-slate-400">{icon}</span>
      {label}
    </span>
  );
}
