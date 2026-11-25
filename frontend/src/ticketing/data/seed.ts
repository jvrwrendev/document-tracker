import type { BorrowSlip, ServiceRequest } from '@/ticketing/types';

const now = new Date();

function iso(offsetDays: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function createServiceRequestReference(sequence: number): string {
  return `SR-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`;
}

export function createBorrowSlipReference(sequence: number): string {
  return `BS-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`;
}

export const seedServiceRequests: ServiceRequest[] = [
  {
    id: 'sr-1', referenceNumber: createServiceRequestReference(1),
    requesterName: 'Maria Santos', requesterOffice: 'Office of the City Mayor',
    category: 'IT Support', description: 'Printer on the second floor is not responding to print jobs.',
    priority: 'high', status: 'in_progress', assignedPersonnel: 'Juan Dela Cruz',
    dateRequested: iso(-1), updatedAt: iso(0),
  },
  {
    id: 'sr-2', referenceNumber: createServiceRequestReference(2),
    requesterName: 'Ana Reyes', requesterOffice: 'Human Resource Office',
    category: 'Equipment Repair', description: 'Air conditioning unit leaks water during operation.',
    priority: 'medium', status: 'pending', assignedPersonnel: 'Pedro Garcia',
    dateRequested: iso(-2), updatedAt: iso(-2),
  },
  {
    id: 'sr-3', referenceNumber: createServiceRequestReference(3),
    requesterName: 'Luis Fernandez', requesterOffice: 'City Treasurer’s Office',
    category: 'Facility Maintenance', description: 'Broken ceiling light near the records area needs replacement.',
    priority: 'low', status: 'completed', assignedPersonnel: 'Rosa Mendoza',
    dateRequested: iso(-6), updatedAt: iso(-3),
  },
  {
    id: 'sr-4', referenceNumber: createServiceRequestReference(4),
    requesterName: 'Grace Lim', requesterOffice: 'City Engineering Office',
    category: 'Transport Service', description: 'Vehicle for site inspection scheduled tomorrow morning.',
    priority: 'urgent', status: 'pending', assignedPersonnel: 'Unassigned',
    dateRequested: iso(0), updatedAt: iso(0),
  },
  {
    id: 'sr-5', referenceNumber: createServiceRequestReference(5),
    requesterName: 'Ramon Aquino', requesterOffice: 'Social Services Office',
    category: 'Records Assistance', description: 'Request for photocopying of 200 client documents for filing.',
    priority: 'medium', status: 'in_progress', assignedPersonnel: 'Rosa Mendoza',
    dateRequested: iso(-3), updatedAt: iso(-1),
  },
  {
    id: 'sr-6', referenceNumber: createServiceRequestReference(6),
    requesterName: 'Elaine Torres', requesterOffice: 'City Health Office',
    category: 'General Service', description: 'Assistance needed for moving office furniture to the new room.',
    priority: 'low', status: 'completed', assignedPersonnel: 'Pedro Garcia',
    dateRequested: iso(-9), updatedAt: iso(-7),
  },
  {
    id: 'sr-7', referenceNumber: createServiceRequestReference(7),
    requesterName: 'Victor Cruz', requesterOffice: 'Office of the City Mayor',
    category: 'IT Support', description: 'Network connection drops intermittently in the conference room.',
    priority: 'high', status: 'in_progress', assignedPersonnel: 'Juan Dela Cruz',
    dateRequested: iso(-4), updatedAt: iso(-2),
  },
  {
    id: 'sr-8', referenceNumber: createServiceRequestReference(8),
    requesterName: 'Nora Villanueva', requesterOffice: 'City Treasurer’s Office',
    category: 'Equipment Repair', description: 'Office shredder jammed and needs servicing.',
    priority: 'medium', status: 'completed', assignedPersonnel: 'Pedro Garcia',
    dateRequested: iso(-12), updatedAt: iso(-10),
  },
  {
    id: 'sr-9', referenceNumber: createServiceRequestReference(9),
    requesterName: 'Daniel San Jose', requesterOffice: 'City Engineering Office',
    category: 'Facility Maintenance', description: 'Restroom faucet leaking on the third floor.',
    priority: 'low', status: 'pending', assignedPersonnel: 'Unassigned',
    dateRequested: iso(-1), updatedAt: iso(-1),
  },
  {
    id: 'sr-10', referenceNumber: createServiceRequestReference(10),
    requesterName: 'Imelda Ramos', requesterOffice: 'Social Services Office',
    category: 'Records Assistance', description: 'Retrieve archived case files for audit review.',
    priority: 'high', status: 'completed', assignedPersonnel: 'Rosa Mendoza',
    dateRequested: iso(-15), updatedAt: iso(-11),
  },
  {
    id: 'sr-11', referenceNumber: createServiceRequestReference(11),
    requesterName: 'Antonio Bautista', requesterOffice: 'City Health Office',
    category: 'General Service', description: 'Request for additional chairs for the waiting area.',
    priority: 'medium', status: 'pending', assignedPersonnel: 'Unassigned',
    dateRequested: iso(0), updatedAt: iso(0),
  },
  {
    id: 'sr-12', referenceNumber: createServiceRequestReference(12),
    requesterName: 'Sherry Medina', requesterOffice: 'Human Resource Office',
    category: 'IT Support', description: 'Install updated antivirus on three staff laptops.',
    priority: 'urgent', status: 'in_progress', assignedPersonnel: 'Juan Dela Cruz',
    dateRequested: iso(-2), updatedAt: iso(-1),
  },
];

export const seedBorrowSlips: BorrowSlip[] = [
  {
    id: 'bs-1', referenceNumber: createBorrowSlipReference(1),
    borrowerName: 'Juan Dela Cruz', borrowerOffice: 'IT Support Unit',
    itemName: 'Laptop - Dell Latitude 5420', itemDetails: 'Service laptop with charger and carrying case',
    quantity: 1, borrowingDate: iso(-3), expectedReturnDate: iso(2), actualReturnDate: null,
    status: 'borrowed', releasedBy: 'Rosa Mendoza', remarks: 'For on-site network troubleshooting.',
    createdAt: iso(-3), updatedAt: iso(-3),
  },
  {
    id: 'bs-2', referenceNumber: createBorrowSlipReference(2),
    borrowerName: 'Pedro Garcia', borrowerOffice: 'General Services Office',
    itemName: 'Folding Table', itemDetails: 'White plastic folding table, 6 feet',
    quantity: 3, borrowingDate: iso(-8), expectedReturnDate: iso(-2), actualReturnDate: null,
    status: 'overdue', releasedBy: 'Rosa Mendoza', remarks: 'Used for community event; return pending.',
    createdAt: iso(-8), updatedAt: iso(-2),
  },
  {
    id: 'bs-3', referenceNumber: createBorrowSlipReference(3),
    borrowerName: 'Ana Reyes', borrowerOffice: 'Human Resource Office',
    itemName: 'Projector', itemDetails: 'Epson portable projector with HDMI cable',
    quantity: 1, borrowingDate: iso(-5), expectedReturnDate: iso(-8), actualReturnDate: iso(-7),
    status: 'returned', releasedBy: 'Rosa Mendoza', remarks: 'Returned in good condition.',
    createdAt: iso(-5), updatedAt: iso(-7),
  },
  {
    id: 'bs-4', referenceNumber: createBorrowSlipReference(4),
    borrowerName: 'Rosa Mendoza', borrowerOffice: 'Records Office',
    itemName: 'Document Scanner', itemDetails: 'Fujitsu desktop scanner',
    quantity: 1, borrowingDate: iso(-1), expectedReturnDate: iso(4), actualReturnDate: null,
    status: 'borrowed', releasedBy: 'Pedro Garcia', remarks: 'For backlog digitization.',
    createdAt: iso(-1), updatedAt: iso(-1),
  },
  {
    id: 'bs-5', referenceNumber: createBorrowSlipReference(5),
    borrowerName: 'Luis Fernandez', borrowerOffice: 'City Treasurer’s Office',
    itemName: 'Adding Machine', itemDetails: 'Calculator with printer roll',
    quantity: 2, borrowingDate: iso(1), expectedReturnDate: iso(6), actualReturnDate: null,
    status: 'pending', releasedBy: 'Unassigned', remarks: 'Awaiting release by custodian.',
    createdAt: iso(0), updatedAt: iso(0),
  },
  {
    id: 'bs-6', referenceNumber: createBorrowSlipReference(6),
    borrowerName: 'Grace Lim', borrowerOffice: 'City Engineering Office',
    itemName: 'Measuring Wheel', itemDetails: 'Rolling measuring wheel, 10m capacity',
    quantity: 1, borrowingDate: iso(-14), expectedReturnDate: iso(-11), actualReturnDate: iso(-10),
    status: 'returned', releasedBy: 'Pedro Garcia', remarks: '',
    createdAt: iso(-14), updatedAt: iso(-10),
  },
  {
    id: 'bs-7', referenceNumber: createBorrowSlipReference(7),
    borrowerName: 'Victor Cruz', borrowerOffice: 'Office of the City Mayor',
    itemName: 'Wireless Microphone Set', itemDetails: 'Two handheld microphones with receiver',
    quantity: 1, borrowingDate: iso(-2), expectedReturnDate: iso(1), actualReturnDate: null,
    status: 'borrowed', releasedBy: 'Rosa Mendoza', remarks: 'For staff assembly.',
    createdAt: iso(-2), updatedAt: iso(-2),
  },
  {
    id: 'bs-8', referenceNumber: createBorrowSlipReference(8),
    borrowerName: 'Nora Villanueva', borrowerOffice: 'City Treasurer’s Office',
    itemName: 'File Cabinet Key Set', itemDetails: 'Master keys for records cabinets',
    quantity: 1, borrowingDate: iso(-6), expectedReturnDate: iso(-1), actualReturnDate: iso(-1),
    status: 'returned', releasedBy: 'Rosa Mendoza', remarks: 'Returned same day.',
    createdAt: iso(-6), updatedAt: iso(-1),
  },
];
