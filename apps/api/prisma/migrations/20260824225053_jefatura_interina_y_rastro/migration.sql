-- Jefe interino: releva mientras nadie acreditado pueda tomar el cargo.
ALTER TYPE "AreaRole" ADD VALUE 'JEFE_INTERINO';

-- Rastro del nombramiento: quien lo hizo y por que.
ALTER TABLE "area_memberships" ADD COLUMN "asignadoPor" TEXT;
ALTER TABLE "area_memberships" ADD COLUMN "motivo" TEXT;
