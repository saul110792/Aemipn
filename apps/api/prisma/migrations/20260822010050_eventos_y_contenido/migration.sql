-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('CURSO', 'TALLER', 'SALIDA', 'REUNION', 'CONVOCATORIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('PRESENCIAL', 'EN_LINEA', 'HIBRIDA');

-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLICO', 'MIEMBROS', 'AREA');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "contenido" TEXT,
    "kind" "EventKind" NOT NULL DEFAULT 'TALLER',
    "modalidad" "EventMode" NOT NULL DEFAULT 'PRESENCIAL',
    "lugar" TEXT,
    "urlVideoconferencia" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "areaId" TEXT,
    "visibilidad" "EventVisibility" NOT NULL DEFAULT 'PUBLICO',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "imagenUrl" TEXT,
    "cupo" INTEGER,
    "costo" DECIMAL(10,2),
    "registroUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT,
    "subidoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_publicado_visibilidad_fechaInicio_idx" ON "events"("publicado", "visibilidad", "fechaInicio");

-- CreateIndex
CREATE INDEX "events_areaId_fechaInicio_idx" ON "events"("areaId", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_url_key" ON "media_assets"("url");

-- CreateIndex
CREATE INDEX "media_assets_createdAt_idx" ON "media_assets"("createdAt");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
