-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GlobalRole" ADD VALUE 'JEFE_CIM';
ALTER TYPE "GlobalRole" ADD VALUE 'CIM';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "lesiones" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailVerificadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_claims" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "letra" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDIENTE',
    "revisadaPor" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_userId_usadoEn_idx" ON "email_verifications"("userId", "usadoEn");

-- CreateIndex
CREATE INDEX "course_claims_status_createdAt_idx" ON "course_claims"("status", "createdAt");

-- CreateIndex
CREATE INDEX "course_claims_courseId_status_idx" ON "course_claims"("courseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "course_claims_memberId_courseId_anio_letra_key" ON "course_claims"("memberId", "courseId", "anio", "letra");

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_claims" ADD CONSTRAINT "course_claims_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_claims" ADD CONSTRAINT "course_claims_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
