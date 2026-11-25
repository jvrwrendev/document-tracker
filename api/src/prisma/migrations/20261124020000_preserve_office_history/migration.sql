-- Preserve users and recipient history when an office is deleted.
-- Employees become unassigned; recipient rows keep an office name/code snapshot.

ALTER TABLE "Employee" DROP CONSTRAINT "Employee_officeId_fkey";
ALTER TABLE "Employee" ALTER COLUMN "officeId" DROP NOT NULL;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRecipient" ADD COLUMN "officeName" TEXT;
ALTER TABLE "DocumentRecipient" ADD COLUMN "officeCode" TEXT;

UPDATE "DocumentRecipient" AS recipient
SET "officeName" = office."name",
    "officeCode" = office."code"
FROM "Office" AS office
WHERE recipient."officeId" = office."id";

ALTER TABLE "DocumentRecipient" DROP CONSTRAINT "DocumentRecipient_officeId_fkey";
ALTER TABLE "DocumentRecipient" ALTER COLUMN "officeId" DROP NOT NULL;
ALTER TABLE "DocumentRecipient" ADD CONSTRAINT "DocumentRecipient_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;
