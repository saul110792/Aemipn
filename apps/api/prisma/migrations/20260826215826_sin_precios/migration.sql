-- La asociacion no cobra: la participacion es voluntaria. Llevar columnas de
-- precio y estado de pago obligaba a decidir un valor en cada alta y hacia
-- creer, a quien leyera el esquema, que en algun momento hay que cobrar.

DROP INDEX IF EXISTS "enrollments_paymentStatus_idx";

ALTER TABLE "enrollments" DROP COLUMN "paymentStatus";
ALTER TABLE "enrollments" DROP COLUMN "montoPagado";
ALTER TABLE "enrollments" DROP COLUMN "referenciaPago";

ALTER TABLE "course_editions" DROP COLUMN "costo";
ALTER TABLE "events" DROP COLUMN "costo";

DROP TYPE "PaymentStatus";
