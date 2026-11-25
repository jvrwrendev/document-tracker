import type { DocumentStatus, DocumentType, DocumentClassification, UserRole } from '@/types';

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
 * Mirrors backend ROLE_RESTRICTED_PERMISSIONS for tracking.view.
 */
export const RECIPIENT_TRACKING_ROLES: UserRole[] = ['system_admin', 'office_admin'];

export function canTrackRecipients(role: UserRole | undefined | null): boolean {
  return !!role && RECIPIENT_TRACKING_ROLES.includes(role);
}


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

export interface OfficeDirectoryEntry {
  code: string;
  name: string;
  group: string;
}

export const OFFICE_DIRECTORY: OfficeDirectoryEntry[] = [
  // Main LGU Departments and Offices
  { code: "CMO", name: "City Mayor's Office", group: "DEPARTMENT" },
  { code: "SPO", name: "Sangguniang Panlungsod Office", group: "DEPARTMENT" },
  { code: "OCA", name: "Office of the City Administrator", group: "DEPARTMENT" },
  { code: "CACCO", name: "City Accounting Office", group: "DEPARTMENT" },
  { code: "CAGO", name: "City Agriculture Office", group: "DEPARTMENT" },
  { code: "CASSO", name: "City Assessor's Office", group: "DEPARTMENT" },
  { code: "CBO", name: "City Budget Office", group: "DEPARTMENT" },
  { code: "CCRO", name: "City Civil Registrar's Office", group: "DEPARTMENT" },
  { code: "CCO", name: "City Cooperative Office", group: "DEPARTMENT" },
  {
    code: "CDRRMO",
    name: "City Disaster Risk Reduction and Management Office",
    group: "DEPARTMENT",
  },
  { code: "CEEO", name: "City Economic Enterprise Office", group: "DEPARTMENT" },
  { code: "CEO", name: "City Engineer's Office", group: "DEPARTMENT" },
  {
    code: "CENRO",
    name: "City Environment and Natural Resource Office",
    group: "DEPARTMENT",
  },
  { code: "CGSO", name: "City General Services Office", group: "DEPARTMENT" },
  { code: "CHO", name: "City Health Office", group: "DEPARTMENT" },
  { code: "CLO", name: "City Legal Office", group: "DEPARTMENT" },
  {
    code: "OCPDC",
    name: "Office of the City Planning and Development Coordinator",
    group: "DEPARTMENT",
  },
  {
    code: "CSWDO",
    name: "City Social Welfare and Development Office",
    group: "DEPARTMENT",
  },
  { code: "CTO", name: "City Treasurer's Office", group: "DEPARTMENT" },
  { code: "CVO", name: "City Veterinary Office", group: "DEPARTMENT" },
  { code: "HRMO", name: "Human Resource Management Office", group: "DEPARTMENT" },
  { code: "OBO", name: "Office of the Building Official", group: "DEPARTMENT" },

  // City Mayor's Office Divisions
  {
    code: "CMO-AD",
    name: "City Mayor's Office - Administrative Division",
    group: "CMO",
  },
  {
    code: "ABED",
    name: "Agricultural and Biosystem Engineering Division",
    group: "CMO",
  },
  {
    code: "AIDSAD",
    name: "Anti-Illegal Drug and Substance Abuse Division",
    group: "CMO",
  },
  {
    code: "BCAD",
    name: "Barangay and Community Affairs Division",
    group: "CMO",
  },
  {
    code: "BVTED",
    name: "Basic, Vocational and Technical Education Division",
    group: "CMO",
  },
  { code: "BAC", name: "Bids and Awards Committee Office", group: "CMO" },
  {
    code: "CNHPDD",
    name: "City Nutrition and Human Physical Development Division",
    group: "CMO",
  },
  {
    code: "CTCAD",
    name: "City Tourism and Cultural Affairs Division",
    group: "CMO",
  },
  { code: "CL", name: "City Library", group: "CMO" },
  { code: "ICAD", name: "Internal Control and Audit Division", group: "CMO" },
  {
    code: "PDAO",
    name: "Person with Disability Affairs Office Division",
    group: "CMO",
  },
  {
    code: "CYDO",
    name: "Valencia City Youth Development Office Division",
    group: "CMO",
  },
  {
    code: "LNALD",
    name: "Local and National Agencies Liaison Division",
    group: "CMO",
  },
  { code: "SGRD", name: "Sports and Games Regulations Division", group: "CMO" },
  { code: "CSD", name: "Civil Security Division", group: "CMO" },
  { code: "CEC", name: "City Events Committee", group: "CMO" },
  { code: "GAD", name: "Gender and Development Office", group: "CMO" },
  { code: "ST", name: "Sanitation Team", group: "CMO" },

  // Sangguniang Panlungsod Offices
  { code: "OVM", name: "Office of the City Vice Mayor", group: "SPO" },
  { code: "OSS", name: "Office of the Secretary to the Sanggunian", group: "SPO" },
  { code: "OC-BERNAL", name: "Office of Councilor Bernal", group: "SPO" },
  { code: "OC-RECLA", name: "Office of Councilor Cadigal-Recla", group: "SPO" },
  { code: "OC-CENTILLAS", name: "Office of Councilor Centillas", group: "SPO" },
  { code: "OC-DEASIS", name: "Office of Councilor De Asis", group: "SPO" },
  {
    code: "OC-FERNANDEZ",
    name: "Office of Councilor Galario-Fernandez",
    group: "SPO",
  },
  { code: "OC-HERA", name: "Office of Councilor Hera", group: "SPO" },
  { code: "OC-LAVINA", name: "Office of Councilor Laviña", group: "SPO" },
  {
    code: "OC-CABALLERO",
    name: "Office of Councilor Mabao-Caballero",
    group: "SPO",
  },
  { code: "OC-SISTOSO", name: "Office of Councilor Sistoso", group: "SPO" },
  { code: "OC-ZAMBRANO", name: "Office of Councilor Zambrano", group: "SPO" },
  { code: "IPMR", name: "Indigenous Peoples Representative Office", group: "SPO" },
  { code: "ABC", name: "Liga ng mga Barangay Office", group: "SPO" },
  { code: "SKF", name: "SK Federation Office", group: "SPO" },

  // Office of the City Administrator Divisions
  {
    code: "EPSD",
    name: "Employment and Placement Services Division",
    group: "OCA",
  },
  {
    code: "ITSD",
    name: "Information Technology Service Division",
    group: "OCA",
  },
  { code: "NC", name: "Negosyo Center", group: "OCA" },
  { code: "PLD", name: "Permit and Licenses Division", group: "OCA" },
  {
    code: "LEDIPO",
    name: "Local Economic Development and Investment Promotion Office",
    group: "OCA",
  },
  {
    code: "PIAD",
    name: "Public Information and Assistance Division",
    group: "OCA",
  },
  {
    code: "CTTMD",
    name: "City Traffic and Transportation Management Division",
    group: "OCA",
  },

  // City Economic Enterprise Office Divisions
  {
    code: "CEEO-AD",
    name: "City Economic Enterprise Office - Administrative Division",
    group: "CEEO",
  },
  {
    code: "PCGPD",
    name: "Public Cemetery, Gym and Plaza Division",
    group: "CEEO",
  },
  { code: "CMD", name: "Central Market Division", group: "CEEO" },
  { code: "FMD", name: "Farmer's Market Division", group: "CEEO" },
  {
    code: "PTTD-NT",
    name: "Public Transportation Terminal Division - New Terminal",
    group: "CEEO",
  },
  {
    code: "PTTD-OT",
    name: "Public Transportation Terminal Division - Old Terminal",
    group: "CEEO",
  },
  {
    code: "FAOD-FL",
    name: "Food Animal Operation Division - Valencia City Fishlanding",
    group: "CEEO",
  },
  {
    code: "FAOD-SH",
    name: "Food Animal Operation Division - Valencia City Slaughterhouse",
    group: "CEEO",
  },

  // National Government Agencies
  {
    code: "COMELEC",
    name: "Commission on Elections",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "DA",
    name: "Department of Agriculture",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "DILG",
    name: "Department of the Interior and Local Government",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "LTO",
    name: "Land Transportation Office",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "OCP",
    name: "Prosecutor's Office",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "PAO",
    name: "Public Attorney's Office",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "PNP",
    name: "Valencia City Philippine National Police",
    group: "NATIONAL_AGENCY",
  },
  {
    code: "POST",
    name: "Valencia City Post Office",
    group: "NATIONAL_AGENCY",
  },
];