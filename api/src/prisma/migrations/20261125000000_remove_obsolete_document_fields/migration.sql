-- Preserve legacy workflow metadata before dropping obsolete columns.
INSERT INTO "DocumentTracking" ("id", "documentId", "actorId", "event", "payload", "occurredAt")
SELECT
  gen_random_uuid()::text,
  d."id",
  d."encodedById",
  'document.legacy_workflow',
  jsonb_build_object(
    'currentOfficeId', d."currentOfficeId",
    'currentHolderId', d."currentHolderId",
    'approvedById', d."approvedById",
    'approvedAt', d."approvedAt",
    'approvedRemarks', d."approvedRemarks",
    'releasedById', d."releasedById",
    'releasedAt', d."releasedAt",
    'releasedRemarks', d."releasedRemarks"
  ),
  COALESCE(d."releasedAt", d."approvedAt", d."updatedAt")
FROM "Document" d
WHERE
  d."currentOfficeId" IS NOT NULL
  OR d."currentHolderId" IS NOT NULL
  OR d."approvedById" IS NOT NULL
  OR d."approvedAt" IS NOT NULL
  OR d."approvedRemarks" IS NOT NULL
  OR d."releasedById" IS NOT NULL
  OR d."releasedAt" IS NOT NULL
  OR d."releasedRemarks" IS NOT NULL;

DROP INDEX IF EXISTS "Document_currentOfficeId_idx";
DROP INDEX IF EXISTS "Document_currentHolderId_idx";

ALTER TABLE "Document"
  DROP COLUMN "currentOfficeId",
  DROP COLUMN "currentHolderId",
  DROP COLUMN "approvedById",
  DROP COLUMN "approvedAt",
  DROP COLUMN "approvedRemarks",
  DROP COLUMN "releasedById",
  DROP COLUMN "releasedAt",
  DROP COLUMN "releasedRemarks";
