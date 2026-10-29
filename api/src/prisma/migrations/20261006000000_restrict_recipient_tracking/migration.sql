-- Restrict Recipient Tracking (documents.track) to SYSTEM_ADMIN + OFFICE_ADMIN.
--
-- Recipient Tracking shows how a document was distributed to every receiving
-- office and which of them have acknowledged receipt. A Document Officer
-- receives documents routed to their own office, and a Document Encoder
-- registers documents; neither may monitor distribution, which would expose
-- offices outside their own.
--
-- The API enforces this by role (RECIPIENT_TRACKING_ROLES in
-- documents.service.ts, @Roles on GET /documents/:id/recipients), so this
-- migration is what makes the UI-facing permission agree with it. Without it a
-- previously seeded database would keep reporting documents.track to these
-- roles through effectivePermissions() and the client would still render the
-- feature.
--
-- Idempotent: safe to run on a database that never had the grant.

DELETE FROM "RolePermission"
WHERE "permission" = 'documents.track'
  AND "role" IN ('DOCUMENT_ENCODER', 'DOCUMENT_OFFICER');

-- The approval / rejection workflow was removed from the workflow. Drop any
-- leftover grants for permissions that are no longer in the catalog so they
-- cannot keep authorizing the retired review endpoints.
DELETE FROM "RolePermission"
WHERE "permission" IN ('documents.review', 'documents.approve', 'documents.reject');
