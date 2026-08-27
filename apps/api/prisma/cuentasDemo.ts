/**
 * Cuentas de prueba para recorrer el sistema desde cada rol.
 *
 * Existen para poder responder "¿qué ve realmente un jefe de área?" entrando
 * como uno, en vez de deducirlo del código. Cubren los caminos que de otro modo
 * solo se prueban con scripts: aislamiento entre áreas, tesorero, miembro raso
 * y recién registrado sin curso aprobado.
 *
 * Son **personas**, no cuentas de rol: tienen nombre, teléfono y boleta, y el
 * cargo se les otorga encima. Antes se llamaban "Jefe Escalada en Roca" y eso
 * daba a entender que la jefatura era una cuenta aparte, cuando en realidad
 * cuelga de alguien del padrón que un día la toma y otro día la deja.
 *
 * Nunca se crean con NODE_ENV=production, aunque el interruptor esté en true.
 */
import bcrypt from 'bcryptjs';
import type { Cargo, PrismaClient } from '@prisma/client';

interface Config {
  password: string;
  dominio: string;
}

interface Plantilla {
  /// Encabeza el correo. Se conserva descriptivo (`jefe.boulder`) porque sirve
  /// para saber con cuál entrar; el nombre de la persona es otra cosa.
  llave: string;
  nombre: string;
  apellido: string;
  apellidoMaterno: string;
  telefono: string;
  boleta: string;
  /// slug del área, o null para quien no pertenece a ninguna.
  areaSlug: string | null;
  /// `null` = pertenece al área sin cargo.
  cargo: Cargo | null;
  rolGlobal: 'ADMIN' | 'STAFF' | 'JEFE_CIM' | 'MIEMBRO' | 'CIM';
  /// Si se le acredita el curso base de su área, que es lo que da la membresía.
  conCursoBase: boolean;
  para: string;
}

/// Área, nombre visible, y la persona que hoy la encabeza.
const AREAS = [
  ['alta-montana', 'Alta Montaña', 'Ernesto', 'Villalobos', 'Cortés', '5514220398', '2018320145'],
  ['media-montana', 'Media Montaña', 'Adriana', 'Nájera', 'Peralta', '5533871204', '2017640922'],
  ['ciclismo-de-montana', 'Ciclismo de Montaña', 'Gerardo', 'Ontiveros', 'Lara', '5529044761', '2019310587'],
  ['escalada-en-roca', 'Escalada en Roca', 'Mariana', 'Zepeda', 'Ruvalcaba', '5541709283', '2016520314'],
  ['boulder', 'Boulder', 'Néstor', 'Ibáñez', 'Fuentes', '5556138890', '2020410276'],
  ['canonismo', 'Cañonismo', 'Lucía', 'Ferreiro', 'Mendiola', '5527395514', '2015730668'],
  ['espeleologia', 'Espeleología', 'Aarón', 'Sandoval', 'Trejo', '5518662047', '2014810439'],
  ['fotografia-de-montana', 'Fotografía de Montaña', 'Talía', 'Barrientos', 'Osuna', '5563250178', '2021220853'],
] as const;

function plantillas(): Plantilla[] {
  const jefes: Plantilla[] = AREAS.map(([slug, area, nombre, paterno, materno, tel, boleta]) => ({
    llave: `jefe.${slug}`,
    nombre,
    apellido: paterno,
    apellidoMaterno: materno,
    telefono: tel,
    boleta,
    areaSlug: slug,
    cargo: 'JEFE_DE_AREA',
    rolGlobal: 'MIEMBRO',
    conCursoBase: true,
    para: `${nombre} ${paterno} — jefa/jefe de ${area}`,
  }));

  return [
    ...jefes,
    {
      llave: 'exjefe.escalada-en-roca',
      nombre: 'Salvador', apellido: 'Higuera', apellidoMaterno: 'Cantú',
      telefono: '5507934412', boleta: '2012450730',
      areaSlug: 'escalada-en-roca',
      // Sin cargo hoy: el seed le abre y le cierra un periodo pasado, para que
      // el historial tenga algo real que enseñar desde el primer arranque.
      cargo: null,
      rolGlobal: 'MIEMBRO',
      conCursoBase: true,
      para: 'Fue jefe de Escalada y ya no: aparece en el historial',
    },
    {
      llave: 'tesorero.alta-montana',
      nombre: 'Beatriz', apellido: 'Arellano', apellidoMaterno: 'Quintanar',
      telefono: '5539118625', boleta: '2018270491',
      areaSlug: 'alta-montana',
      cargo: 'TESORERO',
      rolGlobal: 'MIEMBRO',
      conCursoBase: true,
      para: 'Ve el padrón de su área pero no valida cursos',
    },
    {
      llave: 'miembro.escalada-en-roca',
      nombre: 'Joaquín', apellido: 'Rentería', apellidoMaterno: 'Vidal',
      telefono: '5548003367', boleta: '2022130954',
      areaSlug: 'escalada-en-roca',
      cargo: null,
      rolGlobal: 'MIEMBRO',
      conCursoBase: true,
      para: 'Miembro raso: solo su área, sin padrón',
    },
    {
      llave: 'jefe.cim',
      nombre: 'Fernanda', apellido: 'Escalante', apellidoMaterno: 'Bermúdez',
      telefono: '5511748206', boleta: '2016880125',
      areaSlug: null,
      cargo: null,
      rolGlobal: 'JEFE_CIM',
      conCursoBase: false,
      para: 'Coordina el CIM; no ve las áreas',
    },
    {
      llave: 'recien.registrado',
      nombre: 'Emiliano', apellido: 'Padilla', apellidoMaterno: 'Guzmán',
      telefono: '5560492718', boleta: '2026010382',
      areaSlug: null,
      cargo: null,
      rolGlobal: 'CIM',
      conCursoBase: false,
      para: 'Sin curso aprobado: no pertenece a ninguna área',
    },
  ];
}

export async function sembrarCuentasDemo(
  prisma: PrismaClient,
  { password, dominio }: Config,
): Promise<{ email: string; para: string }[]> {
  const hash = await bcrypt.hash(password, 12);
  const areas = await prisma.area.findMany();
  const creadas: { email: string; para: string }[] = [];

  for (const p of plantillas()) {
    const email = `${p.llave}@${dominio}`.toLowerCase();
    const area = p.areaSlug ? areas.find((a) => a.slug === p.areaSlug) : null;

    const member = await prisma.member.upsert({
      where: { email },
      create: {
        nombre: p.nombre,
        apellidoPaterno: p.apellido,
        apellidoMaterno: p.apellidoMaterno,
        email,
        telefono: p.telefono,
        boleta: p.boleta,
        status: 'ACTIVO',
        tipoSangre: 'O+',
        contactoEmergencia: 'Contacto de prueba',
        telefonoEmergencia: '5555555555',
        numeroSeguroSocial: '00000000000',
        notas: 'Cuenta de prueba creada por el seed.',
      },
      // El expediente es el punto: un cargo cuelga de alguien con teléfono y
      // boleta, no de una cuenta sin datos.
      update: {
        status: 'ACTIVO',
        nombre: p.nombre,
        apellidoPaterno: p.apellido,
        apellidoMaterno: p.apellidoMaterno,
        telefono: p.telefono,
        boleta: p.boleta,
      },
    });

    // El curso base es lo que acredita el área, y sin él un jefe titular no
    // sería nombrable: la regla se cumple también para las cuentas de prueba.
    if (p.conCursoBase && area) {
      const cursoBase = await prisma.course.findFirst({
        where: { areaId: area.id, kind: 'AREA' },
      });
      if (cursoBase) {
        const anio = new Date().getFullYear() - 2;
        await prisma.courseClaim.upsert({
          where: {
            memberId_courseId_anio_letra: {
              memberId: member.id,
              courseId: cursoBase.id,
              anio,
              letra: 'A',
            },
          },
          create: {
            memberId: member.id,
            courseId: cursoBase.id,
            anio,
            letra: 'A',
            status: 'APROBADA',
            revisadaPor: 'seed',
            revisadaEn: new Date(),
          },
          update: { status: 'APROBADA' },
        });
      }
    }

    // Pertenecer al área: lo da el curso base, y aquí se hace explícito.
    if (area && p.conCursoBase) {
      await prisma.areaMembership.upsert({
        where: { memberId_areaId: { memberId: member.id, areaId: area.id } },
        create: {
          memberId: member.id,
          areaId: area.id,
          asignadoPor: 'seed',
          motivo: 'Cuenta de prueba',
        },
        update: { activo: true },
      });
    }

    // El cargo va encima, como un periodo con principio. Sin unicidad en la
    // tabla, hay que mirar si ya existe o cada corrida abriría uno nuevo.
    if (area && p.cargo) {
      const abierta = await prisma.jefatura.findFirst({
        where: { memberId: member.id, areaId: area.id, cargo: p.cargo, hasta: null },
        select: { id: true },
      });
      if (!abierta) {
        await prisma.jefatura.create({
          data: {
            memberId: member.id,
            areaId: area.id,
            cargo: p.cargo,
            asignadoPor: 'seed',
            motivo: 'Cuenta de prueba',
          },
        });
      }
    }

    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: hash,
        role: p.rolGlobal,
        memberId: member.id,
        // Sembrada a mano: no hay correo que confirmar.
        emailVerificadoEn: new Date(),
      },
      update: {
        role: p.rolGlobal,
        activo: true,
        emailVerificadoEn: new Date(),
        passwordHash: hash,
        // Volver a ligarlo no es redundante: borrar el expediente deja el
        // usuario con memberId nulo, y sin esto el seed no lo reparaba nunca.
        memberId: member.id,
      },
    });

    creadas.push({ email, para: p.para });
  }

  await sembrarAspirantesDelCim(prisma, dominio);
  await sembrarHistorialDeEscalada(prisma, dominio);

  return creadas;
}

/**
 * Un relevo de jefatura ya ocurrido, con las ediciones de cada periodo.
 *
 * El historial vacío no se puede evaluar: no se distingue "todavía no ha
 * pasado nada" de "no funciona". Esto le da a Escalada en Roca un jefe
 * anterior, su relevo y dos generaciones pasadas del curso básico, para que
 * la pantalla enseñe de una vez la forma que va a tener en la realidad.
 */
async function sembrarHistorialDeEscalada(prisma: PrismaClient, dominio: string) {
  const area = await prisma.area.findUnique({ where: { slug: 'escalada-en-roca' } });
  const curso = await prisma.course.findFirst({ where: { areaId: area?.id, kind: 'AREA' } });
  if (!area || !curso) return;

  const [saliente, actual] = await Promise.all([
    prisma.member.findUnique({ where: { email: `exjefe.escalada-en-roca@${dominio}` } }),
    prisma.member.findUnique({ where: { email: `jefe.escalada-en-roca@${dominio}` } }),
  ]);
  if (!saliente || !actual) return;

  const anio = new Date().getFullYear();
  const enero = (a: number) => new Date(a, 0, 15);

  // Periodo cerrado del saliente: tres años, hasta el enero pasado.
  const yaTiene = await prisma.jefatura.findFirst({
    where: { memberId: saliente.id, areaId: area.id },
    select: { id: true },
  });
  if (!yaTiene) {
    await prisma.jefatura.create({
      data: {
        memberId: saliente.id,
        areaId: area.id,
        cargo: 'JEFE_DE_AREA',
        desde: enero(anio - 3),
        hasta: enero(anio - 1),
        asignadoPor: 'seed',
        motivo: 'Electo en asamblea de área',
        relevadoPor: 'seed',
        motivoRelevo: 'Concluyó su periodo',
      },
    });
    // Y el periodo del actual arranca donde termina el anterior, no hoy.
    await prisma.jefatura.updateMany({
      where: { memberId: actual.id, areaId: area.id, hasta: null },
      data: { desde: enero(anio - 1), motivo: 'Relevó al jefe saliente' },
    });
  }

  // Dos generaciones pasadas del curso base, cada una con su instructor.
  const PASADAS: { clave: string; anio: number; instructor: string }[] = [
    { clave: `${curso.codigo}_${anio - 3}A`, anio: anio - 3, instructor: saliente.id },
    { clave: `${curso.codigo}_${anio - 2}A`, anio: anio - 2, instructor: saliente.id },
  ];

  for (const e of PASADAS) {
    const existente = await prisma.courseEdition.findUnique({ where: { clave: e.clave } });
    if (existente) continue;
    await prisma.courseEdition.create({
      data: {
        clave: e.clave,
        courseId: curso.id,
        fechaInicio: new Date(e.anio, 1, 10),
        fechaFin: new Date(e.anio, 4, 20),
        estado: 'CONCLUIDA',
        cupo: 16,
        sede: 'Los Dinamos, Magdalena Contreras',
        notas: 'Generación anterior, sembrada para el historial de jefaturas.',
        instructores: { connect: [{ id: e.instructor }] },
      },
    });
  }

  // La edición en marcha la lleva quien encabeza hoy.
  await prisma.courseEdition.updateMany({ where: { clave: `${curso.codigo}_${anio}A` }, data: {} });
  const enMarcha = await prisma.courseEdition.findUnique({ where: { clave: `${curso.codigo}_${anio}A` } });
  if (enMarcha) {
    await prisma.courseEdition.update({
      where: { id: enMarcha.id },
      data: { instructores: { connect: [{ id: actual.id }] } },
    });
  }

  console.log('  Historial de Escalada en Roca: un relevo y dos generaciones anteriores');
}

/**
 * Aspirantes en el CIM abierto.
 *
 * Sin ellos el resumen del jefe muestra el bloque del CIM en ceros y parece
 * roto, cuando justamente ahí es donde debe ver a los nuevos interesados.
 * Son miembros sin usuario: todavía no entran al sistema, solo se apuntaron.
 */
async function sembrarAspirantesDelCim(prisma: PrismaClient, dominio: string) {
  const edicion = await prisma.courseEdition.findFirst({
    where: { course: { kind: 'CIM' }, estado: { in: ['BORRADOR', 'INSCRIPCIONES_ABIERTAS', 'EN_CURSO'] } },
    orderBy: { fechaInicio: 'asc' },
  });
  if (!edicion) return;

  const ASPIRANTES: { nombre: string; apellido: string; status: 'PREINSCRITO' | 'INSCRITO' }[] = [
    { nombre: 'Ximena', apellido: 'Cordero', status: 'INSCRITO' },
    { nombre: 'Rodrigo', apellido: 'Bañuelos', status: 'INSCRITO' },
    { nombre: 'Paulina', apellido: 'Estrada', status: 'INSCRITO' },
    { nombre: 'Ulises', apellido: 'Marín', status: 'INSCRITO' },
    { nombre: 'Renata', apellido: 'Quiroz', status: 'PREINSCRITO' },
    { nombre: 'Iván', apellido: 'Salgado', status: 'PREINSCRITO' },
    { nombre: 'Dánae', apellido: 'Oropeza', status: 'PREINSCRITO' },
  ];

  const sinAcentos = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const a of ASPIRANTES) {
    const email = `${sinAcentos(a.nombre)}.${sinAcentos(a.apellido)}@${dominio}`;
    const member = await prisma.member.upsert({
      where: { email },
      create: {
        nombre: a.nombre,
        apellidoPaterno: a.apellido,
        email,
        status: 'ASPIRANTE',
        contactoEmergencia: 'Contacto de prueba · 55 5555 5555',
      },
      update: {},
    });

    await prisma.enrollment.upsert({
      where: { memberId_editionId: { memberId: member.id, editionId: edicion.id } },
      create: { memberId: member.id, editionId: edicion.id, status: a.status },
      update: { status: a.status },
    });
  }

  console.log(`  ${ASPIRANTES.length} aspirantes en ${edicion.clave} (para que el resumen del CIM tenga cifras)`);
}
