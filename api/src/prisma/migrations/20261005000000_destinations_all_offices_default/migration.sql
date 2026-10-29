-- "All offices" is now opt-in: a document must never fan out to every office
-- unless the encoder explicitly selected that option during registration.
ALTER TABLE "Document" ALTER COLUMN "destinationsAllOffices" SET DEFAULT false;