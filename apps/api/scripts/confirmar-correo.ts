/**
 * Confirma la cuenta de alguien a mano, sin liga ni código.
 *
 * Pensado para cuando el registro llegó pero el correo no salió (por ejemplo,
 * sin SMTP_URL configurado en producción): el token y el código solo se
 * guardan hasheados (ver lib/verificacion.ts), así que una vez perdidos no
 * hay forma de recuperarlos. Esto rodea el problema activando la cuenta
 * directamente, igual que si la persona hubiera confirmado por su cuenta.
 *
 *   npx tsx scripts/confirmar-correo.ts alguien@ejemplo.mx            (solo muestra)
 *   npx tsx scripts/confirmar-correo.ts alguien@ejemplo.mx --aplicar
 *
 * Sin --aplicar no toca nada: primero enseña el estado actual.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [correo, ...banderas] = process.argv.slice(2);
  if (!correo) {
    console.error('Falta el correo. Ejemplo: npx tsx scripts/confirmar-correo.ts alguien@ejemplo.mx');
    process.exit(1);
  }

  const aplicar = banderas.includes('--aplicar');
  const email = correo.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { member: { select: { nombre: true, apellidoPaterno: true } } },
  });

  if (!user) {
    console.error(`No hay ninguna cuenta con el correo ${email}.`);
    process.exit(1);
  }

  const nombre = user.member ? `${user.member.nombre} ${user.member.apellidoPaterno}` : '(sin ficha de miembro)';
  console.log(`\n${nombre} <${user.email}>`);
  console.log(`  Correo verificado: ${user.emailVerificadoEn ? user.emailVerificadoEn.toISOString() : 'no'}`);
  console.log(`  Cuenta activa:     ${user.activo ? 'sí' : 'no'}`);
  console.log(`  Rol:               ${user.role}`);

  if (user.emailVerificadoEn && user.activo) {
    console.log('\nYa está confirmada y activa. No hay nada que hacer.\n');
    return;
  }

  if (!aplicar) {
    console.log('\nEsto es solo una vista previa. Para confirmarla:');
    console.log(`  npx tsx scripts/confirmar-correo.ts ${email} --aplicar\n`);
    return;
  }

  await prisma.$transaction([
    // Deja sin vigencia cualquier liga/código pendiente: ya no hace falta.
    prisma.emailVerification.updateMany({
      where: { userId: user.id, usadoEn: null },
      data: { usadoEn: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerificadoEn: new Date(), activo: true },
    }),
  ]);

  console.log(`\nListo: ${email} ya puede iniciar sesión.\n`);
}

main()
  .catch((e) => {
    console.error('Falló:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
