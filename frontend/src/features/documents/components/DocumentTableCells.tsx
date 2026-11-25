import { Link } from 'react-router-dom';
import { ClassificationBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import {
  DOCUMENT_CLASSIFICATION_LABELS,
  DOCUMENT_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/constants';
import type { DocumentListItem } from '@/features/documents/types/document';

interface DocumentTrackingLinkProps {
  id: string;
  trackingNumber: string;
}

export function DocumentTrackingLink({ id, trackingNumber }: DocumentTrackingLinkProps) {
  return (
    <Link
      to={`/documents/${id}`}
      className="font-mono text-[12px] font-semibold text-brand-700 hover:underline"
    >
      {trackingNumber}
    </Link>
  );
}

interface DocumentTitleCellProps {
  document: Pick<
    DocumentListItem,
    'id' | 'title' | 'type' | 'classification' | 'priority' | 'tags'
  >;
}

export function DocumentTitleCell({ document }: DocumentTitleCellProps) {
  const typeLabel = DOCUMENT_TYPE_LABELS[document.type] ?? document.type;
  const hasClassification = !!document.classification && document.classification in DOCUMENT_CLASSIFICATION_LABELS;
  const hasPriority = !!document.priority && document.priority in PRIORITY_LABELS;

  return (
    <div className="min-w-0">
      <Link
        to={`/documents/${document.id}`}
        className="block truncate text-[13px] font-medium text-slate-900 hover:text-brand-700"
      >
        {document.title}
      </Link>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <span className="text-[11px] text-slate-500">{typeLabel}</span>
        {hasClassification && (
          <>
            <span className="text-slate-300">·</span>
            <ClassificationBadge classification={document.classification} />
          </>
        )}
        {hasPriority && <PriorityBadge priority={document.priority} />}
      </div>
      {document.tags?.length > 0 && (
        <div className="mt-1 flex items-center gap-1.5">
          {document.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-slate-400 font-mono">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
