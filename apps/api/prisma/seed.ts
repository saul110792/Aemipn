/**
 * Semilla de la base de datos AEMIPN.
 * Idempotente: se puede correr varias veces sin duplicar nada.
 *   npm run db:seed
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/lib/env.js';

const prisma = new PrismaClient();

/** Las disciplinas de la asociacion, en el orden en que se muestran. */
const AREAS = [
  {
    slug: 'alta-montana',
    nombre: 'Alta Montaña',
    color: '#1e3a5f',
    descripcion: 'Ascensos a los volcanes y cumbres mayores de México por encima de los 4,000 m.',
    contenido:
      'El área de Alta Montaña se dedica al ascenso de las grandes cumbres del país: Iztaccíhuatl, Pico de Orizaba, Nevado de Toluca y La Malinche. Se trabaja aclimatación, progresión en nieve y hielo, uso de crampones y piolet, y manejo del mal agudo de montaña.',
  },
  {
    slug: 'media-montana',
    nombre: 'Media Montaña',
    color: '#2d6a4f',
    descripcion: 'Excursionismo y senderismo en cerros y sierras, la puerta de entrada al montañismo.',
    contenido:
      'Media Montaña organiza salidas de senderismo y excursionismo de un día o fin de semana. Es donde la mayoría de los miembros empieza: orientación con mapa y brújula, marcha en terreno irregular, armado de mochila y campamento.',
  },
  {
    slug: 'ciclismo-de-montana',
    nombre: 'Ciclismo de Montaña',
    color: '#bc6c25',
    descripcion: 'Rodadas en terracería, singletrack y travesías de varios días en bicicleta.',
    contenido:
      'El área de Ciclismo de Montaña realiza rodadas técnicas y de resistencia. Se enseña mecánica básica en ruta, manejo en descenso, lectura de terreno y planeación de travesías.',
  },
  {
    slug: 'escalada-en-roca',
    nombre: 'Escalada en Roca',
    color: '#9d0208',
    descripcion: 'Escalada deportiva y tradicional en pared, con enfoque en seguridad y aseguramiento.',
    contenido:
      'Escalada en Roca cubre escalada deportiva y tradicional en formaciones naturales. Se forma en nudos, aseguramiento, montaje de reuniones, rapel y autorrescate básico.',
  },
  {
    slug: 'boulder',
    nombre: 'Boulder',
    color: '#3a5a40',
    descripcion: 'Escalada sin cuerda a baja altura, en muro techado y en roca natural.',
    contenido:
      'El área de Boulder trabaja tanto en modalidad indoor (rocódromo, entrenamiento y sesiones semanales) como outdoor (bloques de roca natural). Se enfoca en técnica de movimiento, fuerza de dedos, lectura de bloques y uso correcto del crash pad.',
  },
  {
    slug: 'canonismo',
    nombre: 'Cañonismo',
    color: '#0077b6',
    descripcion: 'Descenso de cañones y barrancos combinando rapel, nado y destrepe.',
    contenido:
      'Cañonismo desciende cañones acuáticos y secos. Combina técnicas de cuerda, natación en aguas rápidas y progresión en roca húmeda. Fuerte énfasis en lectura de hidrología y ventanas de temporada.',
  },
  {
    slug: 'espeleologia',
    nombre: 'Espeleología',
    color: '#5a189a',
    descripcion: 'Exploración, topografía y estudio de cuevas y sistemas subterráneos.',
    contenido:
      'El área de Espeleología explora y topografía cavernas y sótanos. Se practica técnica vertical sobre cuerda (TSA), progresión en pasajes estrechos y registro topográfico. Trabajo estrecho con la conservación del medio subterráneo.',
  },
  {
    slug: 'fotografia-de-montana',
    nombre: 'Fotografía de Montaña',
    color: '#6c757d',
    descripcion: 'Registro visual de las actividades y del entorno natural de la asociación.',
    contenido:
      'Fotografía de Montaña documenta las salidas de todas las áreas y forma en técnica fotográfica en condiciones de montaña: luz de alta montaña, cuidado del equipo en frío y humedad, composición de paisaje y retrato en actividad.',
  },
] as const;

async function main() {
  console.log('Sembrando base de datos AEMIPN...\n');

  // --- Areas ---------------------------------------------------------------
  for (const [i, area] of AREAS.entries()) {
    await prisma.area.upsert({
      where: { slug: area.slug },
      create: { ...area, orden: i },
      update: { ...area, orden: i },
    });
  }
  console.log(`  ${AREAS.length} areas`);

  // --- CIM: curso transversal, sin area propia -----------------------------
  const cim = await prisma.course.upsert({
    where: { slug: 'cim' },
    create: {
      slug: 'cim',
      nombre: 'Curso Introductorio al Montañismo (CIM)',
      kind: 'CIM',
      descripcion:
        'Curso de un fin de semana que presenta todas las disciplinas de la AEMIPN mediante una salida por área. Es la puerta de entrada a la asociación.',
      contenido:
        'El CIM se imparte de tres a cuatro veces al año. Durante un fin de semana el aspirante participa en una actividad de cada área (alta montaña, media montaña, ciclismo, escalada, boulder, cañonismo, espeleología y fotografía) para conocer de primera mano de qué trata cada disciplina y elegir dónde integrarse.',
      requisitos:
        'Ser mayor de edad o contar con autorización del tutor. No se requiere experiencia previa. Traer ropa deportiva, calzado de suela firme, agua y lonche.',
      duracionHoras: 20,
    },
    update: {},
  });
  console.log('  Curso CIM');

  // --- Cursos tecnicos por area -------------------------------------------
  const CURSOS_POR_AREA: Record<string, { slug: string; nombre: string; horas: number }[]> = {
    'alta-montana': [
      { slug: 'progresion-en-nieve-y-hielo', nombre: 'Progresión en nieve y hielo', horas: 24 },
      { slug: 'aclimatacion-y-mal-de-montana', nombre: 'Aclimatación y mal agudo de montaña', horas: 8 },
    ],
    'media-montana': [
      { slug: 'orientacion-mapa-y-brujula', nombre: 'Orientación con mapa y brújula', horas: 12 },
      { slug: 'campismo-y-armado-de-mochila', nombre: 'Campismo y armado de mochila', horas: 8 },
    ],
    'ciclismo-de-montana': [
      { slug: 'mecanica-basica-en-ruta', nombre: 'Mecánica básica en ruta', horas: 8 },
    ],
    'escalada-en-roca': [
      { slug: 'nudos-y-aseguramiento', nombre: 'Nudos y aseguramiento', horas: 12 },
      { slug: 'escalada-tradicional', nombre: 'Escalada tradicional', horas: 24 },
    ],
    boulder: [{ slug: 'tecnica-de-movimiento', nombre: 'Técnica de movimiento en boulder', horas: 10 }],
    canonismo: [{ slug: 'rapel-y-progresion-acuatica', nombre: 'Rapel y progresión acuática', horas: 16 }],
    espeleologia: [
      { slug: 'tecnica-vertical-sobre-cuerda', nombre: 'Técnica vertical sobre cuerda (TSA)', horas: 20 },
      { slug: 'topografia-de-cavernas', nombre: 'Topografía de cavernas', horas: 12 },
    ],
    'fotografia-de-montana': [
      { slug: 'fotografia-de-paisaje-en-altura', nombre: 'Fotografía de paisaje en altura', horas: 10 },
    ],
  };

  let totalCursos = 0;
  for (const [areaSlug, cursos] of Object.entries(CURSOS_POR_AREA)) {
    const area = await prisma.area.findUnique({ where: { slug: areaSlug } });
    if (!area) continue;
    for (const c of cursos) {
      await prisma.course.upsert({
        where: { slug: c.slug },
        create: {
          slug: c.slug,
          nombre: c.nombre,
          kind: 'TECNICO',
          duracionHoras: c.horas,
          areaId: area.id,
        },
        update: { areaId: area.id },
      });
      totalCursos++;
    }
  }
  console.log(`  ${totalCursos} cursos tecnicos`);

  // --- Primera edicion del CIM del ano en curso ----------------------------
  const anio = new Date().getFullYear();
  const clave = `CIM ${anio}-1`;

  const edicion = await prisma.courseEdition.upsert({
    where: { clave },
    create: {
      clave,
      courseId: cim.id,
      fechaInicio: new Date(anio, 2, 7), // primer fin de semana de marzo (aproximado)
      fechaFin: new Date(anio, 2, 8),
      cupo: 40,
      costo: 350,
      sede: 'ESIA Zacatenco y Parque Nacional Desierto de los Leones',
      estado: 'BORRADOR',
      notas: 'Edicion de ejemplo creada por el seed. Ajusta fechas y sede antes de publicar.',
    },
    update: {},
  });

  // Una salida por area dentro del CIM, que es como esta disenado el curso.
  const areas = await prisma.area.findMany({ orderBy: { orden: 'asc' } });
  const yaTiene = await prisma.editionActivity.count({ where: { editionId: edicion.id } });

  if (yaTiene === 0) {
    await prisma.editionActivity.createMany({
      data: areas.map((area, i) => {
        const fechaInicio = new Date(edicion.fechaInicio);
        fechaInicio.setHours(8 + Math.floor(i / 4) * 24 + (i % 4) * 2, 0, 0, 0);
        return {
          editionId: edicion.id,
          areaId: area.id,
          titulo: `Salida de ${area.nombre}`,
          descripcion: `Sesion introductoria de ${area.nombre}.`,
          fechaInicio,
        };
      }),
    });
    console.log(`  Edicion ${clave} con ${areas.length} salidas`);
  } else {
    console.log(`  Edicion ${clave} (ya tenia actividades)`);
  }

  // --- Administrador inicial ----------------------------------------------
  const adminEmail = env.SEED_ADMIN_EMAIL.toLowerCase();

  const adminMember = await prisma.member.upsert({
    where: { email: adminEmail },
    create: {
      nombre: 'Administrador',
      apellidoPaterno: 'AEMIPN',
      email: adminEmail,
      status: 'ACTIVO',
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12),
      role: 'ADMIN',
      memberId: adminMember.id,
    },
    update: { role: 'ADMIN', activo: true },
  });

  console.log(`  Admin: ${adminEmail}`);
  console.log(`\nListo. Entra al panel con ${adminEmail} / (SEED_ADMIN_PASSWORD de tu .env)\n`);
}

main()
  .catch((e) => {
    console.error('Fallo el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
