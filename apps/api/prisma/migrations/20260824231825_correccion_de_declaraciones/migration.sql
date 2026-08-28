-- Quien corrigio una declaracion y cuando.
ALTER TABLE "course_claims" ADD COLUMN "editadaPor" TEXT;
ALTER TABLE "course_claims" ADD COLUMN "editadaEn" TIMESTAMP(3);
