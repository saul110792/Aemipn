-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('ADMIN', 'STAFF', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "AreaRole" AS ENUM ('JEFE_DE_AREA', 'TESORERO', 'MIEMBRO');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ASPIRANTE', 'ACTIVO', 'INACTIVO', 'BAJA');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NUEVA', 'EN_REVISION', 'ACEPTADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('CIM', 'TECNICO', 'CERTIFICACION', 'TALLER');

-- CreateEnum
CREATE TYPE "EditionStatus" AS ENUM ('BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PREINSCRITO', 'INSCRITO', 'ACREDITADO', 'NO_ACREDITADO', 'BAJA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO', 'EXENTO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "GlobalRole" NOT NULL DEFAULT 'MIEMBRO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "boleta" TEXT,
    "escuela" TEXT,
    "tipoSangre" TEXT,
    "alergias" TEXT,
    "padecimientos" TEXT,
    "contactoEmergencia" TEXT,
    "telefonoEmergencia" TEXT,
    "numeroSeguroSocial" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ASPIRANTE',
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "fotoUrl" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_applications" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "escuela" TEXT,
    "boleta" TEXT,
    "areasInteres" TEXT[],
    "experiencia" TEXT,
    "mensaje" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NUEVA',
    "revisadaPor" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "memberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "contenido" TEXT,
    "imagenUrl" TEXT,
    "color" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area_memberships" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "role" "AreaRole" NOT NULL DEFAULT 'MIEMBRO',
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "kind" "CourseKind" NOT NULL DEFAULT 'TECNICO',
    "descripcion" TEXT,
    "contenido" TEXT,
    "requisitos" TEXT,
    "duracionHoras" INTEGER,
    "areaId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_editions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "inscripcionesAbren" TIMESTAMP(3),
    "inscripcionesCierran" TIMESTAMP(3),
    "cupo" INTEGER,
    "costo" DECIMAL(10,2),
    "sede" TEXT,
    "estado" "EditionStatus" NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edition_activities" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "areaId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "lugar" TEXT,
    "cupo" INTEGER,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edition_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PREINSCRITO',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "montoPagado" DECIMAL(10,2),
    "referenciaPago" TEXT,
    "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAcreditacion" TIMESTAMP(3),
    "calificacion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_memberId_key" ON "users"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "members_email_key" ON "members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_boleta_key" ON "members"("boleta");

-- CreateIndex
CREATE INDEX "members_status_idx" ON "members"("status");

-- CreateIndex
CREATE INDEX "members_apellidoPaterno_nombre_idx" ON "members"("apellidoPaterno", "nombre");

-- CreateIndex
CREATE INDEX "membership_applications_status_createdAt_idx" ON "membership_applications"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "areas_slug_key" ON "areas"("slug");

-- CreateIndex
CREATE INDEX "area_memberships_areaId_role_idx" ON "area_memberships"("areaId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "area_memberships_memberId_areaId_key" ON "area_memberships"("memberId", "areaId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_kind_activo_idx" ON "courses"("kind", "activo");

-- CreateIndex
CREATE UNIQUE INDEX "course_editions_clave_key" ON "course_editions"("clave");

-- CreateIndex
CREATE INDEX "course_editions_estado_fechaInicio_idx" ON "course_editions"("estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "edition_activities_editionId_fechaInicio_idx" ON "edition_activities"("editionId", "fechaInicio");

-- CreateIndex
CREATE INDEX "enrollments_editionId_status_idx" ON "enrollments"("editionId", "status");

-- CreateIndex
CREATE INDEX "enrollments_paymentStatus_idx" ON "enrollments"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_memberId_editionId_key" ON "enrollments"("memberId", "editionId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_memberships" ADD CONSTRAINT "area_memberships_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area_memberships" ADD CONSTRAINT "area_memberships_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_editions" ADD CONSTRAINT "course_editions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_activities" ADD CONSTRAINT "edition_activities_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "course_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_activities" ADD CONSTRAINT "edition_activities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_activities" ADD CONSTRAINT "edition_activities_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "course_editions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
