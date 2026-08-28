-- Piezas que la app va a necesitar y que la web ya puede estrenar.

CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'TARDE', 'JUSTIFICADO', 'AUSENTE');

CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "actividadId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "nota" TEXT,
    "registradaPorId" TEXT,
    -- Hora del dispositivo. Distinta de createdAt cuando se tomo sin senal.
    "registradaEn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asistencias_actividadId_memberId_key" ON "asistencias"("actividadId", "memberId");
CREATE INDEX "asistencias_memberId_idx" ON "asistencias"("memberId");

ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_actividadId_fkey"
  FOREIGN KEY ("actividadId") REFERENCES "edition_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_registradaPorId_fkey"
  FOREIGN KEY ("registradaPorId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Punto de encuentro: casi nunca es el mismo sitio de la actividad.
ALTER TABLE "edition_activities" ADD COLUMN "puntoEncuentro" TEXT;
ALTER TABLE "edition_activities" ADD COLUMN "latitud" DOUBLE PRECISION;
ALTER TABLE "edition_activities" ADD COLUMN "longitud" DOUBLE PRECISION;
ALTER TABLE "edition_activities" ADD COLUMN "horaEncuentro" TIMESTAMP(3);

-- Reintentos sin duplicar: la clave la genera el cliente.
CREATE TABLE "peticiones_idempotentes" (
    "clave" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "estado" INTEGER NOT NULL,
    "respuesta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "peticiones_idempotentes_pkey" PRIMARY KEY ("clave")
);

CREATE INDEX "peticiones_idempotentes_createdAt_idx" ON "peticiones_idempotentes"("createdAt");
