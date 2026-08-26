-- Desertar no es lo mismo que reprobar: uno abandona, el otro llega al final.
ALTER TYPE "EnrollmentStatus" ADD VALUE 'DESERTO';

-- Motivo y rastro de una cancelacion.
ALTER TABLE "course_editions" ADD COLUMN "motivoCancelacion" TEXT;
ALTER TABLE "course_editions" ADD COLUMN "canceladaEn" TIMESTAMP(3);
ALTER TABLE "course_editions" ADD COLUMN "canceladaPor" TEXT;
