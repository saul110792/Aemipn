-- Requisitos entre cursos: A no se puede tomar sin tener acreditado B.
CREATE TABLE "_RequisitosDeCurso" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_RequisitosDeCurso_AB_unique" ON "_RequisitosDeCurso"("A", "B");
CREATE INDEX "_RequisitosDeCurso_B_index" ON "_RequisitosDeCurso"("B");

ALTER TABLE "_RequisitosDeCurso" ADD CONSTRAINT "_RequisitosDeCurso_A_fkey"
  FOREIGN KEY ("A") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RequisitosDeCurso" ADD CONSTRAINT "_RequisitosDeCurso_B_fkey"
  FOREIGN KEY ("B") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
