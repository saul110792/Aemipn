-- El cargo deja de ser un campo de la membresia y pasa a ser un periodo propio.
-- Asi un jefe relevado y vuelto a nombrar no pisa su registro anterior, y la
-- co-jefatura deja de necesitar trucos: son dos periodos vigentes a la vez.

CREATE TYPE "Cargo" AS ENUM ('JEFE_DE_AREA', 'JEFE_INTERINO', 'TESORERO');

CREATE TABLE "jefaturas" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "cargo" "Cargo" NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "asignadoPor" TEXT,
    "motivo" TEXT,
    "relevadoPor" TEXT,
    "motivoRelevo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jefaturas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "jefaturas_areaId_cargo_desde_idx" ON "jefaturas"("areaId", "cargo", "desde");
CREATE INDEX "jefaturas_memberId_desde_idx" ON "jefaturas"("memberId", "desde");

ALTER TABLE "jefaturas" ADD CONSTRAINT "jefaturas_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jefaturas" ADD CONSTRAINT "jefaturas_areaId_fkey"
  FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rescatar los nombramientos que existen antes de tirar la columna. Un cargo
-- inactivo ya termino: si no quedo fecha, se cierra con la de su ultima edicion.
INSERT INTO "jefaturas" ("id", "memberId", "areaId", "cargo", "desde", "hasta", "asignadoPor", "motivo", "createdAt", "updatedAt")
SELECT
  'jf_' || "id",
  "memberId",
  "areaId",
  "role"::text::"Cargo",
  "desde",
  CASE WHEN "activo" THEN "hasta" ELSE COALESCE("hasta", "updatedAt") END,
  "asignadoPor",
  "motivo",
  "createdAt",
  "updatedAt"
FROM "area_memberships"
WHERE "role" <> 'MIEMBRO';

-- La membresia se queda con lo suyo: pertenecer al area.
DROP INDEX IF EXISTS "area_memberships_areaId_role_idx";
ALTER TABLE "area_memberships" DROP COLUMN "role";
ALTER TABLE "area_memberships" DROP COLUMN "hasta";
CREATE INDEX "area_memberships_areaId_idx" ON "area_memberships"("areaId");

DROP TYPE "AreaRole";

-- Quienes impartieron cada edicion: es lo que responde "que cursos dio".
CREATE TABLE "_InstructoresDeEdicion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_InstructoresDeEdicion_AB_unique" ON "_InstructoresDeEdicion"("A", "B");
CREATE INDEX "_InstructoresDeEdicion_B_index" ON "_InstructoresDeEdicion"("B");

ALTER TABLE "_InstructoresDeEdicion" ADD CONSTRAINT "_InstructoresDeEdicion_A_fkey"
  FOREIGN KEY ("A") REFERENCES "course_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_InstructoresDeEdicion" ADD CONSTRAINT "_InstructoresDeEdicion_B_fkey"
  FOREIGN KEY ("B") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
