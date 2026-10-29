import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { attachmentsService } from '@/features/documents/services/documents.service';
import { AttachmentPreview } from '@/features/documents/components/AttachmentPreview';

export function AttachmentViewerPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div className="py-20 text-center text-sm text-slate-500">Missing attachment id.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="flex items-center justify-between gap-4 bg-white border-b border-slate-200 px-5 py-3">
        <Link to="/documents" className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Back to Documents
        </Link>
        <a
          href={attachmentsService.downloadUrl(id)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-4 py-6 px-4">
        <AttachmentPreview attachmentId={id} />
      </div>
    </div>
  );
}
