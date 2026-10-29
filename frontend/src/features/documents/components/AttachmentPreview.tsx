import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Download } from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { attachmentsService } from '@/features/documents/services/documents.service';
import { API_BASE_URL } from '@/lib/apiConfig';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type FileKind = 'pdf' | 'image' | 'docx' | 'unsupported';

function detectKind(contentType: string, fileName: string | null): FileKind {
  const ct = contentType.toLowerCase();
  const name = (fileName ?? '').toLowerCase();
  if (ct.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image';
  if (ct.includes('wordprocessingml') || ct.includes('msword') || /\.docx?$/.test(name)) {
    return 'docx';
  }
  return 'unsupported';
}

function fileNameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return match ? decodeURIComponent(match[1].replace(/"/g, '')) : null;
}

export function AttachmentPreview({ attachmentId }: { attachmentId: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<FileKind | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const fileUrl = `${attachmentsService.downloadUrl(attachmentId)}?inline=1`;

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    async function load() {
      try {
        const doFetch = () => fetch(fileUrl, { credentials: 'include' });

        let response = await doFetch();
        if (response.status === 401) {
          await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          response = await doFetch();
        }
        if (!response.ok) {
          throw new Error(`Failed to load file (${response.status}).`);
        }
        const contentType = response.headers.get('Content-Type') ?? '';
        const name = fileNameFromContentDisposition(response.headers.get('Content-Disposition'));
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        blobRef.current = blob;
        if (!revoked) {
          setKind(detectKind(contentType, name));
          setFileName(name);
          setBlobUrl(objectUrl);
        }
      } catch (err) {
        if (!revoked) setError(err instanceof Error ? err.message : 'Failed to load file.');
      }
    }

    void load();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileUrl]);

  useEffect(() => {
    if (kind !== 'docx' || !blobRef.current || !docxContainerRef.current) return;
    let cancelled = false;
    renderAsync(blobRef.current, docxContainerRef.current, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
      renderEndnotes: true,
    }).catch(() => {
      if (!cancelled) setError('Failed to render the Word document.');
    });
    return () => {
      cancelled = true;
    };
  }, [kind, blobUrl]);

  return (
    <div className="flex flex-col items-center gap-4 bg-white">
      {error ? (
        <p className="text-sm text-rose-600 py-10">{error}</p>
      ) : !blobUrl || !kind ? (
        <p className="text-sm text-slate-500 py-10">Loading…</p>
      ) : kind === 'pdf' ? (
        <Document
          file={blobUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={err => setError(err.message)}
          loading={<p className="text-sm text-slate-500 py-10">Loading PDF…</p>}
        >
          <Page pageNumber={pageNumber} width={Math.min(window.innerWidth - 160, 820)} />
        </Document>
      ) : kind === 'image' ? (
        <img src={blobUrl} alt={fileName ?? 'Attachment'} className="max-w-full bg-white shadow-sm" />
      ) : kind === 'docx' ? (
        <div ref={docxContainerRef} className="w-full bg-white shadow-sm px-4 py-6" />
      ) : (
        <div className="text-center py-10 space-y-2">
          <p className="text-sm text-slate-600">Preview is not available for this file type.</p>
          <a
            href={attachmentsService.downloadUrl(attachmentId)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            Download to view
          </a>
        </div>
      )}
      {kind === 'pdf' && numPages > 1 && (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <button
            type="button"
            className="px-2 py-1 border border-slate-200 rounded bg-white disabled:opacity-40"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            Page {pageNumber} of {numPages}
          </span>
          <button
            type="button"
            className="px-2 py-1 border border-slate-200 rounded bg-white disabled:opacity-40"
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
