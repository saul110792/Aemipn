-- Pasar alergias de texto libre a lista, sin perder lo ya capturado.
ALTER TABLE "members" ADD COLUMN "alergias_lista" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "members"
SET "alergias_lista" = (
  SELECT array_agg(btrim(x))
  FROM unnest(string_to_array(replace("alergias", ';', ','), ',')) AS x
  WHERE btrim(x) <> ''
)
WHERE "alergias" IS NOT NULL AND btrim("alergias") <> '';

ALTER TABLE "members" DROP COLUMN "alergias";
ALTER TABLE "members" RENAME COLUMN "alergias_lista" TO "alergias";
ALTER TABLE "members" ALTER COLUMN "alergias" SET NOT NULL;
ALTER TABLE "members" ALTER COLUMN "alergias" SET DEFAULT ARRAY[]::TEXT[];
