-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('CLASE_TEORICA', 'SALIDA_1_DIA', 'CAMPAMENTO', 'EXAMEN_TEORICO', 'EXAMEN_PRACTICO', 'PRESENTACION_FINAL', 'OTRA');

-- AlterTable: abreviaturas para construir la clave de cada edicion.
-- Nacen nulas, asi que el indice unico no puede chocar con datos existentes.
ALTER TABLE "areas" ADD COLUMN "codigo" TEXT;
ALTER TABLE "courses" ADD COLUMN "codigo" TEXT;

-- AlterTable: tipo de sesion dentro de una edicion.
ALTER TABLE "edition_activities" ADD COLUMN "kind" "ActivityKind" NOT NULL DEFAULT 'CLASE_TEORICA';

-- CreateIndex
CREATE UNIQUE INDEX "areas_codigo_key" ON "areas"("codigo");
CREATE UNIQUE INDEX "courses_codigo_key" ON "courses"("codigo");
