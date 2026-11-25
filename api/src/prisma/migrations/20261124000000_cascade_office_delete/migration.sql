-- Deleting an office also removes its employees and per-office recipient rows.
-- Existing records are preserved; this only changes future delete behaviour.

ALTER TABLE "Employee" DROP CONSTRAINT "Employee_officeId_fkey";
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRecipient" DROP CONSTRAINT "DocumentRecipient_officeId_fkey";
ALTER TABLE "DocumentRecipient" ADD CONSTRAINT "DocumentRecipient_officeId_fkey"
  FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;
