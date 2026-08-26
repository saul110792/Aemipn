/**
 * Cuentas de prueba para recorrer el sistema desde cada rol.
 *
 * Existen para poder responder "¿qué ve realmente un jefe de área?" entrando
 * como uno, en vez de deducirlo del código. Cubren los caminos que de otro modo
 * solo se prueban con scripts: aislamiento entre áreas, tesorero, miembro raso
 * y recién registrado sin curso aprobado.
 *
 * Nunca se crean con NODE_ENV=production, aunque el interruptor esté en true.
 */
import bcrypt from 'bcryptjs';
import type { AreaRole, PrismaClient } from '@prisma/client';

interface Config {
  password: string;
  dominio: string;
}

interface Plantilla {
  llave: string;
  nombre: string;
  apellido: string;
  /// slug del área, o null para quien no pertenece a ninguna.
  areaSlug: string | null;
  rolArea: AreaRole | null;
  rolGlobal: 'ADMIN' | 'STAFF' | 'JEFE_CIM' | 'MIEMBRO' | 'CIM';
  /// Si se le acredita el curso base de su área, que es lo que da la membresía.
  conCursoBase: boolean;
  para: string;
}

const AREAS = [
  ['alta-montana', 'Alta Montaña'],
  ['media-montana', 'Media Montaña'],
  ['ciclismo-de-montana', 'Ciclismo de Montaña'],
  ['escalada-en-roca', 'Escalada en Roca'],
  ['boulder', 'Boulder'],
  ['canonismo', 'Cañonismo'],
  ['espeleologia', 'Espeleología'],
  ['fotografia-de-montana', 'Fotografía de Montaña'],
] as const;

function plantillas(): Plantilla[] {
  const jefes: Plantilla[] = AREAS.map(([slug, nombre]) => ({
    llave: `jefe.${slug}`,
    nombre: 'Jefe',
    apellido: nombre,
    areaSlug: slug,
    rolArea: 'JEFE_DE_AREA',
    rolGlobal: 'MIEMBRO',
    conCursoBase: true,
    para: `Jefe de ${nombre}`,
  }));

  return [
    ...jefes,
    {
      llave: 'tesorero.alta-montana',
      nombre: 'Tesorero',
      apellido: 'Alta Montaña',
      areaSlug: 'alta-montana',
      rolArea: 'TESORERO',
      rolGlobal: 'MIEMBRO',
      conCursoBase: true,
      para: 'Ve el padrón de su área pero no valida cursos',
    },
    {
      llave: 'miembro.escalada-en-roca',
      nombre: 'Miembro',
      apellido: 'Escalada en Roca',
      areaSlug: 'escalada-en-roca',
      rolArea: 'MIEMBRO',
      rolGlobal: 'MIEMBRO',
      conCursoBase: true,
      para: 'Miembro raso: solo su área, sin padrón',
    },
    {
      llave: 'jefe.cim',
      nombre: 'Jefe',
      apellido: 'CIM',
      areaSlug: null,
      rolArea: null,
      rolGlobal: 'JEFE_CIM',
      conCursoBase: false,
      para: 'Coordina el CIM; no ve las áreas',
    },
    {
      llave: 'recien.registrado',
      nombre: 'Recién',
      apellido: 'Registrado',
      areaSlug: null,
      rolArea: null,
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
        email,
        status: 'ACTIVO',
        tipoSangre: 'O+',
        contactoEmergencia: 'Contacto de prueba',
        telefonoEmergencia: '5555555555',
        numeroSeguroSocial: '00000000000',
        notas: 'Cuenta de prueba creada por el seed.',
      },
      update: { status: 'ACTIVO' },
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

    if (area && p.rolArea) {
      await prisma.areaMembership.upsert({
        where: { memberId_areaId: { memberId: member.id, areaId: area.id } },
        create: {
          memberId: member.id,
          areaId: area.id,
          role: p.rolArea,
          asignadoPor: 'seed',
          motivo: 'Cuenta de prueba',
        },
        update: { role: p.rolArea, activo: true, hasta: null },
      });
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
      update: { role: p.rolGlobal, activo: true, emailVerificadoEn: new Date(), passwordHash: hash },
    });

    creadas.push({ email, para: p.para });
  }

  await sembrarAspirantesDelCim(prisma, dominio);

  return creadas;
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
