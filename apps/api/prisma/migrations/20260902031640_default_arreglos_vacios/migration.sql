-- AlterTable
ALTER TABLE "areas" ALTER COLUMN "galeria" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "members" ALTER COLUMN "alergias" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "membership_applications" ALTER COLUMN "areasInteres" SET DEFAULT ARRAY[]::TEXT[];
