-- Renombrar el valor conserva los datos: lo que era TECNICO pasa a AREA y
-- despues el seed reclasifica como TALLER lo que en realidad lo es.
ALTER TYPE "CourseKind" RENAME VALUE 'TECNICO' TO 'AREA';

-- Sin indicar nada, un curso nuevo es un taller: son los mas numerosos.
ALTER TABLE "courses" ALTER COLUMN "kind" SET DEFAULT 'TALLER';
