import { PrismaClient, DocumentTypeCode } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const TEMP_PASSWORD_CHARSET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const TEMP_PASSWORD_LENGTH = 12;

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@city.gov';
const ADMIN_EMPLOYEE_NO = 'EMP-ADMIN-001';
const ADMIN_FIRST_NAME = 'System';
const ADMIN_LAST_NAME = 'Administrator';
const ADMIN_POSITION = 'System Administrator';

const ROOT_OFFICE = {
  code: 'OCM',
  name: 'Office of the City Mayor',
  type: 'main' as const,
};

const DIVISION_OFFICES: Array<{ code: string; name: string }> = [
  { code: 'LEGAL', name: 'City Legal Office' },
  { code: 'HRMO', name: 'City Human Resource Management Office' },
  { code: 'CPDO', name: 'City Planning and Development Office' },
  { code: 'CBO', name: 'City Budget Office' },
  { code: 'ACCT', name: 'City Accounting Office' },
  { code: 'TREAS', name: "City Treasurer's Office" },
  { code: 'ASSESS', name: "City Assessor's Office" },
  { code: 'ENG', name: 'City Engineering Office' },
  { code: 'HEALTH', name: 'City Health Office' },
  {
    code: 'CSWDO',
    name: 'City Social Welfare and Development Office',
  },
  { code: 'GSO', name: 'City General Services Office' },
  { code: 'CCRO', name: "City Civil Registrar's Office" },
];

interface DocumentTypeSeed {
  name: string;
  description: string;
  codes: DocumentTypeCode[];
}

const DOCUMENT_TYPES: DocumentTypeSeed[] = [
  {
    name: 'Memorandum',
    description: 'Internal memos and brief communications between offices.',
    codes: ['memo'],
  },
  {
    name: 'Letter',
    description: 'Formal letters to external parties or other agencies.',
    codes: ['letter'],
  },
  {
    name: 'Ordinance',
    description: 'Local ordinances enacted by the city council.',
    codes: ['ordinance'],
  },
  {
    name: 'Resolution',
    description: 'Formal expressions of the council or governing body.',
    codes: ['resolution'],
  },
  {
    name: 'Report',
    description: 'Activity, accomplishment, and status reports.',
    codes: ['report'],
  },
  {
    name: 'Contract',
    description: 'Contracts, MOUs, and other binding agreements.',
    codes: ['contract'],
  },
  {
    name: 'Circular',
    description: 'Circulars and advisories for general circulation.',
    codes: ['circular'],
  },
  {
    name: 'Communication',
    description: 'General communications sent as letter or memo format.',
    codes: ['letter', 'memo'],
  },
  {
    name: 'Legal Document',
    description: 'Legislative enactments and formal council actions.',
    codes: ['ordinance', 'resolution'],
  },
  {
    name: 'Internal Memorandum',
    description: 'Internal memos distributed as office circulars.',
    codes: ['memo', 'circular'],
  },
  {
    name: 'Administrative Issuance',
    description: 'General administrative issuances across multiple formats.',
    codes: ['circular', 'memo', 'letter'],
  },
  {
    name: 'Other Documents',
    description: 'Other document types that do not fit the standard categories.',
    codes: ['others'],
  },
];

function generateTempPassword(): string {
  let out = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    out +=
      TEMP_PASSWORD_CHARSET[
        Math.floor(Math.random() * TEMP_PASSWORD_CHARSET.length)
      ];
  }
  return out;
}

async function seedOffices() {
  const root = await prisma.office.upsert({
    where: { code: ROOT_OFFICE.code },
    update: {
      name: ROOT_OFFICE.name,
      type: ROOT_OFFICE.type,
      isActive: true,
    },
    create: {
      code: ROOT_OFFICE.code,
      name: ROOT_OFFICE.name,
      type: ROOT_OFFICE.type,
      isActive: true,
    },
  });
  console.log(`\u2714 Office: ${root.code} \u2014 ${root.name} (root)`);

  for (const division of DIVISION_OFFICES) {
    await prisma.office.upsert({
      where: { code: division.code },
      update: {
        name: division.name,
        type: 'division',
        isActive: true,
      },
      create: {
        code: division.code,
        name: division.name,
        type: 'division',
        isActive: true,
      },
    });
  }
  console.log(
    `\u2714 Division offices seeded: ${DIVISION_OFFICES.length} (type: division)`,
  );

  return root;
}

async function seedDocumentTypes(): Promise<void> {
  for (const dt of DOCUMENT_TYPES) {
    const existing = await prisma.documentType.findFirst({
      where: { name: dt.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.documentTypeCodeEntry.deleteMany({
        where: { documentTypeId: existing.id },
      });
      await prisma.documentType.update({
        where: { id: existing.id },
        data: {
          description: dt.description,
          isActive: true,
          codes: { create: dt.codes.map(code => ({ code })) },
        },
      });
    } else {
      await prisma.documentType.create({
        data: {
          name: dt.name,
          description: dt.description,
          isActive: true,
          codes: { create: dt.codes.map(code => ({ code })) },
        },
      });
    }
  }
  console.log(`\u2714 Document types seeded: ${DOCUMENT_TYPES.length}`);
}

async function main(): Promise<void> {
  const office = await seedOffices();

  await seedDocumentTypes();

  const employee = await prisma.employee.upsert({
    where: { employeeNo: ADMIN_EMPLOYEE_NO },
    update: {
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      position: ADMIN_POSITION,
      email: ADMIN_EMAIL,
      officeId: office.id,
      isActive: true,
    },
    create: {
      employeeNo: ADMIN_EMPLOYEE_NO,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      position: ADMIN_POSITION,
      email: ADMIN_EMAIL,
      officeId: office.id,
      isActive: true,
    },
  });
  console.log(
    `\u2714 Employee: ${employee.employeeNo} \u2014 ${employee.firstName} ${employee.lastName}`,
  );

  const existingUser = await prisma.user.findUnique({
    where: { username: ADMIN_USERNAME },
    select: { id: true, email: true, role: true, mustChangePassword: true },
  });

  if (existingUser) {
    console.log(
      `\u2714 Admin user already exists (${ADMIN_USERNAME} / ${existingUser.email}). No changes made.`,
    );
    console.log('  Re-running this seed will NOT rotate the password.');
    return;
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await argon2.hash(temporaryPassword, ARGON2_OPTIONS);

  await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: true,
      emailVerifiedAt: new Date(),
      employeeId: employee.id,
    },
  });

  console.log('\u2714 Admin user created:');
  console.log(`    Username:  ${ADMIN_USERNAME}`);
  console.log(`    Email:     ${ADMIN_EMAIL}`);
  console.log(`    Password:  ${temporaryPassword}`);
  console.log(`    Role:      SYSTEM_ADMIN`);
  console.log(`    mustChangePassword: true`);
  console.log(
    '  \u2192 This password is shown only once. The admin will be required',
  );
  console.log('    to set a new private password on first login.');
  console.log(
    '  \u2192 Re-running this seed will NOT rotate the password.',
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
