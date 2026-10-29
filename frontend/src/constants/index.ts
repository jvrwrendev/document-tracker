import type { DocumentStatus, DocumentType, DocumentClassification, UserRole, Permission } from '@/types';

// Workflow: REGISTERED -> RECEIVED -> ARCHIVED.
// Nothing is ever a user-initiated status change:
//  - 'received' comes from the per-office receiving action.
//  - 'archived' comes from the backend auto-archive job.
// Legacy statuses remain in the union only so historical rows still render.
export const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  registered: ['received'],
  received: [],
  approved: [],
  rejected: [],
  released: [],
  archived: [],
};

export const canTransition = (
  from: DocumentStatus,
  to: DocumentStatus,
): boolean => (ALLOWED_TRANSITIONS[from] ?? []).includes(to);

export const ROLE_LABELS: Record<UserRole, string> = {
  system_admin: 'System Administrator',
  office_admin: 'Office Administrator',
  document_encoder: 'Document Encoder',
  document_officer: 'Document Officer',
};

export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  system_admin: 'System Admin',
  office_admin: 'Office Admin',
  document_encoder: 'Encoder',
  document_officer: 'Officer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  system_admin: 'Full system access. Manages users, offices, roles, and system configuration.',
  office_admin:
    'Manages documents within their authorized office and monitors document status.',
  document_encoder:
    'Registers documents, uploads attachments, and maintains document metadata.',
  document_officer:
    'Receives documents routed to their office and acknowledges receipt with user, office, date, and time.',
};

/**
 * Roles allowed to use Recipient Tracking, which shows how a document was
 * distributed to every receiving office and which of them acknowledged it.
 *
 * This mirrors RECIPIENT_TRACKING_ROLES in the API
 * (api/src/modules/documents/documents.service.ts), which is the authoritative
 * check: the endpoint returns 403 for everyone else regardless of what the UI
 * renders. Kept in sync deliberately so the client hides the feature for
 * exactly the roles the server rejects.
 */
export const RECIPIENT_TRACKING_ROLES: UserRole[] = ['system_admin', 'office_admin'];

export function canTrackRecipients(role: UserRole | undefined | null): boolean {
  return !!role && RECIPIENT_TRACKING_ROLES.includes(role);
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  system_admin: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.edit', 'documents.delete',
    'documents.register', 'documents.receive',
    'documents.track',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'offices.view', 'offices.create', 'offices.edit', 'offices.delete',
    'document_types.view', 'document_types.create', 'document_types.edit', 'document_types.delete',
    'roles.view', 'roles.edit',
    'audit.view',
    'notifications.view',
    'settings.view', 'settings.edit',
  ],
  office_admin: [
    'dashboard.view',
    'documents.view', 'documents.edit', 'documents.delete',
    'documents.track',
    'users.view', 'users.create', 'users.edit',
    'offices.view', 'offices.edit',
    'document_types.view', 'document_types.create', 'document_types.edit',
    'audit.view',
    'notifications.view',
  ],
  document_encoder: [
    'dashboard.view',
    'documents.view', 'documents.create', 'documents.edit', 'documents.register',
    'notifications.view',
  ],
  document_officer: [
    'dashboard.view',
    'documents.view', 'documents.receive',
    'notifications.view',
  ],
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  registered: 'Registered',
  received: 'Received',
  approved: 'Approved',
  rejected: 'Rejected',
  released: 'Released',
  archived: 'Archived',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  registered: 'bg-slate-100 text-slate-700 border-slate-200',
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  released: 'bg-teal-50 text-teal-700 border-teal-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  memo: 'Memorandum',
  letter: 'Letter',
  ordinance: 'Ordinance',
  resolution: 'Resolution',
  report: 'Report',
  contract: 'Contract',
  circular: 'Circular',
  others: 'Others',
};

export const DOCUMENT_CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  restricted: 'Restricted',
};

export const DOCUMENT_CLASSIFICATION_COLORS: Record<DocumentClassification, string> = {
  public: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  internal: 'bg-slate-100 text-slate-700 border-slate-200',
  confidential: 'bg-amber-50 text-amber-700 border-amber-200',
  restricted: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
} as const;

export const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-rose-50 text-rose-700 border-rose-200',
} as const;

export const DOCUMENT_WORKFLOW: DocumentStatus[] = [
  'registered',
  'received',
  'archived',
];

export const ALL_DOCUMENT_STATUSES: DocumentStatus[] = [
  'registered',
  'received',
  'archived',
];

export const ALL_ROLES: UserRole[] = [
  'system_admin',
  'office_admin',
  'document_encoder',
  'document_officer',
];

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'memo', 'letter', 'ordinance', 'resolution', 'report', 'contract', 'circular', 'others',
];

export const ALL_CLASSIFICATIONS: DocumentClassification[] = [
  'public', 'internal', 'confidential', 'restricted',
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const AVATAR_COLORS = [
  'bg-brand-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-purple-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-orange-600',
];

export interface OfficeDirectoryEntry {
  name: string;
  code: string;
  group: string;
}

export const OFFICE_DIRECTORY: OfficeDirectoryEntry[] = [
  // City Government Offices
  { name: 'Office of the City Mayor', code: 'OCM', group: 'City Government Offices' },
   { name: 'Information Technology Service Desk', code: 'ITSD', group: 'City Government Offices' },
  { name: 'Office of the City Vice Mayor', code: 'OCVM', group: 'City Government Offices' },
  { name: 'Sangguniang Panlungsod', code: 'SP', group: 'City Government Offices' },
  { name: "City Administrator's Office", code: 'ADMIN', group: 'City Government Offices' },
  { name: 'City Legal Office', code: 'LEGAL', group: 'City Government Offices' },
  { name: 'City Human Resource Management Office', code: 'HRMO', group: 'City Government Offices' },
  { name: 'City Planning and Development Office', code: 'CPDO', group: 'City Government Offices' },
  { name: 'City Budget Office', code: 'CBO', group: 'City Government Offices' },
  { name: 'City Accounting Office', code: 'ACCT', group: 'City Government Offices' },
  { name: "City Treasurer's Office", code: 'TREAS', group: 'City Government Offices' },
  { name: "City Assessor's Office", code: 'ASSESS', group: 'City Government Offices' },
  { name: 'City Engineering Office', code: 'ENG', group: 'City Government Offices' },
  { name: 'City Agriculture Office', code: 'AGRI', group: 'City Government Offices' },
  { name: 'City Veterinary Office', code: 'VET', group: 'City Government Offices' },
  { name: 'City Health Office', code: 'HEALTH', group: 'City Government Offices' },
  { name: 'City Social Welfare and Development Office', code: 'CSWDO', group: 'City Government Offices' },
  { name: 'City Environment and Natural Resources Office', code: 'CITY-ENRO', group: 'City Government Offices' },
  { name: 'City Disaster Risk Reduction and Management Office', code: 'CDRRMO', group: 'City Government Offices' },
  { name: 'City General Services Office', code: 'GSO', group: 'City Government Offices' },
  { name: "City Civil Registrar's Office", code: 'CCRO', group: 'City Government Offices' },
  { name: 'City Cooperative Office', code: 'COOP', group: 'City Government Offices' },
  { name: 'City Economic Enterprise Office', code: 'CEEO', group: 'City Government Offices' },
  { name: 'Office of the Building Official', code: 'OBO', group: 'City Government Offices' },
  { name: 'Public Employment Service Office (PESO)', code: 'PESO', group: 'City Government Offices' },
  { name: 'Bids and Awards Committee (BAC)', code: 'BAC', group: 'City Government Offices' },
  { name: 'Information and Communications Technology Office', code: 'ICTO', group: 'City Government Offices' },
  { name: 'City Tourism Office', code: 'TOUR', group: 'City Government Offices' },
  { name: 'City Library', code: 'LIBRARY', group: 'City Government Offices' },
  { name: 'Public Information Office', code: 'PIO', group: 'City Government Offices' },
  { name: 'Local Economic Enterprise Office', code: 'LEEO', group: 'City Government Offices' },

  // National Government Offices in Valencia City
  { name: 'Bureau of Fire Protection (BFP)', code: 'BFP', group: 'National Government Offices in Valencia City' },
  { name: 'Bureau of Internal Revenue (BIR)', code: 'BIR', group: 'National Government Offices in Valencia City' },
  { name: 'Bureau of Jail Management and Penology (BJMP)', code: 'BJMP', group: 'National Government Offices in Valencia City' },
  { name: 'Commission on Audit (COA)', code: 'COA', group: 'National Government Offices in Valencia City' },
  { name: 'Commission on Elections (COMELEC)', code: 'COMELEC', group: 'National Government Offices in Valencia City' },
  { name: 'Community Environment and Natural Resources Office (CENRO)', code: 'CENRO', group: 'National Government Offices in Valencia City' },
  { name: 'Department of Agrarian Reform (DAR)', code: 'DAR', group: 'National Government Offices in Valencia City' },
  { name: 'Department of the Interior and Local Government (DILG)', code: 'DILG', group: 'National Government Offices in Valencia City' },
  { name: 'Department of Education â€“ Valencia City', code: 'DEPED-VAL', group: 'National Government Offices in Valencia City' },
  { name: 'Land Transportation Office (LTO)', code: 'LTO', group: 'National Government Offices in Valencia City' },
  { name: 'Municipal Trial Court in Cities (MTCC)', code: 'MTCC', group: 'National Government Offices in Valencia City' },
  { name: 'Pag-IBIG Fund', code: 'PAG-IBIG', group: 'National Government Offices in Valencia City' },
  { name: 'Parole and Probation Office', code: 'PPO', group: 'National Government Offices in Valencia City' },
  { name: 'Philippine Health Insurance Corporation (PhilHealth)', code: 'PHILHEALTH', group: 'National Government Offices in Valencia City' },
  { name: 'Philippine National Police (PNP)', code: 'PNP', group: 'National Government Offices in Valencia City' },
  { name: 'Philippine Postal Corporation (PhilPost)', code: 'PHILPOST', group: 'National Government Offices in Valencia City' },
  { name: 'Professional Regulation Commission (PRC)', code: 'PRC', group: 'National Government Offices in Valencia City' },
  { name: "Prosecutor's Office", code: 'PROSEC', group: 'National Government Offices in Valencia City' },
  { name: "Public Attorney's Office (PAO)", code: 'PAO', group: 'National Government Offices in Valencia City' },
  { name: 'Social Security System (SSS)', code: 'SSS', group: 'National Government Offices in Valencia City' },
  { name: 'Technical Education and Skills Development Authority (TESDA)', code: 'TESDA', group: 'National Government Offices in Valencia City' },
  { name: 'National Irrigation Administration (NIA)', code: 'NIA', group: 'National Government Offices in Valencia City' },
  { name: 'National Food Authority (NFA)', code: 'NFA', group: 'National Government Offices in Valencia City' },
];
