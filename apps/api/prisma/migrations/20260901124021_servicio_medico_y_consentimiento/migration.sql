-- AlterTable: columnas nuevas primero, para poder migrar datos antes de borrar la vieja.
ALTER TABLE "members"
  ADD COLUMN     "consentimientoDatosSensiblesEn" TIMESTAMP(3),
  ADD COLUMN     "contactoEmergencia2" TEXT,
  ADD COLUMN     "telefonoEmergencia2" TEXT,
  ADD COLUMN     "numeroAfiliacion" TEXT,
  ADD COLUMN     "servicioMedico" TEXT;

-- Quien ya tenía un NSS capturado no debe perderlo: se preserva como el
-- número de afiliación de IMSS, que es lo que un NSS siempre fue.
UPDATE "members"
SET "numeroAfiliacion" = "numeroSeguroSocial",
    "servicioMedico" = 'IMSS'
WHERE "numeroSeguroSocial" IS NOT NULL;

ALTER TABLE "members" DROP COLUMN "numeroSeguroSocial";
