/**
 * Quita a una persona de sus áreas, a nivel base.
 *
 * "Relevar" desde el panel es una baja lógica: conserva el registro histórico
 * (activo=false, hasta=hoy) porque un jefe saliente sigue siendo del área. Eso
 * está bien para la operación real, pero deja rastro cuando lo que hubo fue un
 * error de captura — y ese rastro sigue apareciendo en el expediente.
 *
 * Este script borra de verdad. Es para corregir equivocaciones, no para dar de
 * baja gente: para eso está el panel.
 *
 *   npx tsx scripts/quitar-areas.ts alguien@ejemplo.mx            (solo muestra)
 *   npx tsx scripts/quitar-areas.ts alguien@ejemplo.mx --aplicar
 *   npx tsx scripts/quitar-areas.ts alguien@ejemplo.mx --aplicar --con-cursos
 *
 * Sin --aplicar no toca nada: primero enseña qué se llevaría.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [email, ...banderas] = process.argv.slice(2);
  if (!email) {
    console.error('Falta el correo. Ejemplo: npx tsx scripts/quitar-areas.ts admin@aemipn.mx');
    process.exit(1);
  }

  const aplicar = banderas.includes('--aplicar');
  // Las declaraciones aprobadas de curso base son lo que otorga la membresía.
  // Si se dejan, la persona sigue apareciendo como del área en su expediente
  // y volver a asignarla es un clic. Por eso se pueden llevar en el mismo paso.
  const conCursos = banderas.includes('--con-cursos');

  const member = await prisma.member.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true, nombre: true, apellidoPaterno: true, email: true,
      areas: {
        include: { area: { select: { nombre: true } } },
        orderBy: { desde: 'asc' },
      },
      cursosDeclarados: {
        include: { course: { select: { codigo: true, nombre: true, kind: true, area: { select: { nombre: true } } } } },
      },
      user: { select: { role: true } },
    },
  });

  if (!member) {
    console.error(`No hay expediente con el correo ${email}.`);
    process.exit(1);
  }

  console.log(`\n${member.nombre} ${member.apellidoPaterno} <${member.email}>  rol global: ${member.user?.role ?? 'sin usuario'}`);

  console.log(`\nÁreas (${member.areas.length}):`);
  for (const m of member.areas) {
    const estado = m.activo ? 'activa' : 'ya inactiva';
    console.log(`  - ${m.area.nombre.padEnd(24)} ${m.role.padEnd(14)} ${estado}`);
  }
  if (!member.areas.length) console.log('  (ninguna)');

  const deArea = member.cursosDeclarados.filter((c) => c.course.kind === 'AREA' || c.course.kind === 'CIM');
  console.log(`\nCursos declarados que abren área (${deArea.length}):`);
  for (const c of deArea) {
    console.log(`  - ${(c.course.codigo ?? '—').padEnd(6)} ${c.course.nombre.padEnd(44)} ${c.status}`);
  }
  if (!deArea.length) console.log('  (ninguno)');

  if (!aplicar) {
    console.log('\nEsto es solo una vista previa. Para borrarlo:');
    console.log(`  npx tsx scripts/quitar-areas.ts ${email} --aplicar${conCursos ? ' --con-cursos' : ''}`);
    console.log('  (agrega --con-cursos para llevarte también las declaraciones)\n');
    return;
  }

  // En una transacción: quitar la membresía y dejar la declaración que la
  // otorga sería dejar el expediente contradiciéndose a sí mismo.
  const resultado = await prisma.$transaction(async (tx) => {
    const areas = await tx.areaMembership.deleteMany({ where: { memberId: member.id } });
    const cursos = conCursos
      ? await tx.courseClaim.deleteMany({ where: { memberId: member.id } })
      : { count: 0 };
    return { areas: areas.count, cursos: cursos.count };
  });

  console.log(`\nBorradas ${resultado.areas} membresía(s) de área.`);
  if (conCursos) console.log(`Borradas ${resultado.cursos} declaración(es) de curso.`);
  else if (deArea.length) {
    console.log(
      `Quedan ${deArea.length} declaración(es) de curso base aprobadas: el expediente seguirá\n` +
      'diciendo que pertenece a esas áreas. Vuelve a correrlo con --con-cursos si también sobran.',
    );
  }
  console.log();
}

main()
  .catch((e) => {
    console.error('Falló:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
