-- Cleanup legacy workflow: routing/review/release tables and exclusive enums.
-- Data backup was taken before this migration under api/storage/backups/legacy-workflow-cleanup-*.

DROP TABLE IF EXISTS "DocumentRelease";
DROP TABLE IF EXISTS "DocumentReview";
DROP TABLE IF EXISTS "DocumentRoutingStep";

DROP TYPE IF EXISTS "ReleaseMethod";
DROP TYPE IF EXISTS "ReviewActionKind";
DROP TYPE IF EXISTS "RoutingStepStatus";
