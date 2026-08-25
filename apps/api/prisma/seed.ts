/**
 * Semilla de la base de datos AEMIPN.
 * Idempotente: se puede correr varias veces sin duplicar nada.
 *   npm run db:seed
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/lib/env.js';

const prisma = new PrismaClient();

/**
 * Las disciplinas de la asociacion, en el orden en que se muestran.
 * Los colores son acentos profundos elegidos para convivir con el guinda
 * institucional del IPN (#611232) sin competir con el.
 */
const AREAS = [
  {
    slug: 'alta-montana',
    codigo: 'AM',
    nombre: 'Alta Montaña',
    color: '#2b4c6f',
    descripcion: 'Ascensos a los volcanes y cumbres mayores de México por encima de los 4,000 m.',
    contenido:
      'El área de Alta Montaña se dedica al ascenso de las grandes cumbres del país: Iztaccíhuatl, Pico de Orizaba, Nevado de Toluca y La Malinche. Se trabaja aclimatación, progresión en nieve y hielo, uso de crampones y piolet, y manejo del mal agudo de montaña.',
  },
  {
    slug: 'media-montana',
    codigo: 'MM',
    nombre: 'Media Montaña',
    color: '#3f6b4a',
    descripcion: 'Excursionismo y senderismo en cerros y sierras, la puerta de entrada al montañismo.',
    contenido:
      'Media Montaña organiza salidas de senderismo y excursionismo de un día o fin de semana. Es donde la mayoría de los miembros empieza: orientación con mapa y brújula, marcha en terreno irregular, armado de mochila y campamento.',
  },
  {
    slug: 'ciclismo-de-montana',
    codigo: 'CM',
    nombre: 'Ciclismo de Montaña',
    color: '#9c5518',
    descripcion: 'Rodadas en terracería, singletrack y travesías de varios días en bicicleta.',
    contenido:
      'El área de Ciclismo de Montaña realiza rodadas técnicas y de resistencia. Se enseña mecánica básica en ruta, manejo en descenso, lectura de terreno y planeación de travesías.',
  },
  {
    slug: 'escalada-en-roca',
    codigo: 'ER',
    nombre: 'Escalada en Roca',
    color: '#8c2f39',
    descripcion: 'Escalada deportiva y tradicional en pared, con enfoque en seguridad y aseguramiento.',
    contenido:
      'Escalada en Roca cubre escalada deportiva y tradicional en formaciones naturales. Se forma en nudos, aseguramiento, montaje de reuniones, rapel y autorrescate básico.',
  },
  {
    slug: 'boulder',
    codigo: 'BO',
    nombre: 'Boulder',
    color: '#5c6b3f',
    descripcion: 'Escalada sin cuerda a baja altura, en muro techado y en roca natural.',
    contenido:
      'El área de Boulder trabaja tanto en modalidad indoor (rocódromo, entrenamiento y sesiones semanales) como outdoor (bloques de roca natural). Se enfoca en técnica de movimiento, fuerza de dedos, lectura de bloques y uso correcto del crash pad.',
  },
  {
    slug: 'canonismo',
    codigo: 'CN',
    nombre: 'Cañonismo',
    color: '#1f6f7a',
    descripcion: 'Descenso de cañones y barrancos combinando rapel, nado y destrepe.',
    contenido:
      'Cañonismo desciende cañones acuáticos y secos. Combina técnicas de cuerda, natación en aguas rápidas y progresión en roca húmeda. Fuerte énfasis en lectura de hidrología y ventanas de temporada.',
  },
  {
    slug: 'espeleologia',
    codigo: 'EP',
    nombre: 'Espeleología',
    color: '#5b3f7a',
    descripcion: 'Exploración, topografía y estudio de cuevas y sistemas subterráneos.',
    contenido:
      'El área de Espeleología explora y topografía cavernas y sótanos. Se practica técnica vertical sobre cuerda (TSA), progresión en pasajes estrechos y registro topográfico. Trabajo estrecho con la conservación del medio subterráneo.',
  },
  {
    slug: 'fotografia-de-montana',
    codigo: 'FM',
    nombre: 'Fotografía de Montaña',
    color: '#55606b',
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
      codigo: 'CIM',
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
    update: { codigo: "CIM" },
  });
  console.log('  Curso CIM');

  // --- Cursos tecnicos por area -------------------------------------------
  // Cada área tiene UN curso propio: acreditarlo es lo que integra a ella.
  // Todo lo demás es un taller, formación complementaria dentro del área.
  // Los códigos son PROVISIONALES, generados con la inicial de cada palabra
  // significativa; se reemplazan cuando llegue el catálogo oficial.
  const CURSO_DE_AREA: Record<string, { slug: string; nombre: string; horas: number; codigo: string }> = {
    'alta-montana': { slug: 'curso-basico-de-alta-montana', nombre: 'Curso Básico de Alta Montaña', horas: 60, codigo: 'CBAM' },
    'media-montana': { slug: 'curso-basico-de-media-montana', nombre: 'Curso Básico de Media Montaña', horas: 40, codigo: 'CBMM' },
    'ciclismo-de-montana': { slug: 'curso-basico-de-ciclismo-de-montana', nombre: 'Curso Básico de Ciclismo de Montaña', horas: 32, codigo: 'CBCM' },
    'escalada-en-roca': { slug: 'curso-basico-de-escalada-en-roca', nombre: 'Curso Básico de Escalada en Roca', horas: 40, codigo: 'CBER' },
    boulder: { slug: 'curso-basico-de-boulder', nombre: 'Curso Básico de Boulder', horas: 24, codigo: 'CBB' },
    canonismo: { slug: 'curso-basico-de-canonismo', nombre: 'Curso Básico de Cañonismo', horas: 40, codigo: 'CBC' },
    espeleologia: { slug: 'curso-basico-de-espeleologia', nombre: 'Curso Básico de Espeleología', horas: 48, codigo: 'CBE' },
    'fotografia-de-montana': { slug: 'curso-basico-de-fotografia-de-montana', nombre: 'Curso Básico de Fotografía de Montaña', horas: 24, codigo: 'CBFM' },
  };

  const TALLERES_POR_AREA: Record<string, { slug: string; nombre: string; horas: number; codigo: string }[]> = {
    'alta-montana': [
      { slug: 'progresion-en-nieve-y-hielo', nombre: 'Progresión en nieve y hielo', horas: 24, codigo: 'TPNH' },
      { slug: 'aclimatacion-y-mal-de-montana', nombre: 'Aclimatación y mal agudo de montaña', horas: 8, codigo: 'TAMM' },
    ],
    'media-montana': [
      { slug: 'orientacion-mapa-y-brujula', nombre: 'Orientación con mapa y brújula', horas: 12, codigo: 'TOMB' },
      { slug: 'campismo-y-armado-de-mochila', nombre: 'Campismo y armado de mochila', horas: 8, codigo: 'TCAM' },
    ],
    'ciclismo-de-montana': [
      { slug: 'mecanica-basica-en-ruta', nombre: 'Mecánica básica en ruta', horas: 8, codigo: 'TMBR' },
    ],
    'escalada-en-roca': [
      { slug: 'nudos-y-aseguramiento', nombre: 'Nudos y aseguramiento', horas: 12, codigo: 'TNA' },
      { slug: 'escalada-tradicional', nombre: 'Escalada tradicional', horas: 24, codigo: 'TET' },
    ],
    boulder: [
      { slug: 'tecnica-de-movimiento', nombre: 'Técnica de movimiento en boulder', horas: 10, codigo: 'TTMB' },
    ],
    canonismo: [
      { slug: 'rapel-y-progresion-acuatica', nombre: 'Rapel y progresión acuática', horas: 16, codigo: 'TRPA' },
    ],
    espeleologia: [
      { slug: 'tecnica-vertical-sobre-cuerda', nombre: 'Técnica vertical sobre cuerda (TSA)', horas: 20, codigo: 'TTVC' },
      { slug: 'topografia-de-cavernas', nombre: 'Topografía de cavernas', horas: 12, codigo: 'TTC' },
    ],
    'fotografia-de-montana': [
      { slug: 'fotografia-de-paisaje-en-altura', nombre: 'Fotografía de paisaje en altura', horas: 10, codigo: 'TFPA' },
    ],
  };

  let totalCursos = 0;
  let totalTalleres = 0;

  const areasSembradas = await prisma.area.findMany({ orderBy: { orden: 'asc' } });

  for (const area of areasSembradas) {
    const curso = CURSO_DE_AREA[area.slug];
    if (curso) {
      await prisma.course.upsert({
        where: { slug: curso.slug },
        create: {
          slug: curso.slug,
          codigo: curso.codigo,
          nombre: curso.nombre,
          kind: 'AREA',
          duracionHoras: curso.horas,
          areaId: area.id,
          descripcion: `Curso base de ${area.nombre}. Acreditarlo integra al área.`,
        },
        update: { areaId: area.id, codigo: curso.codigo, kind: 'AREA' },
      });
      totalCursos++;
    }

    for (const t of TALLERES_POR_AREA[area.slug] ?? []) {
      await prisma.course.upsert({
        where: { slug: t.slug },
        create: {
          slug: t.slug,
          codigo: t.codigo,
          nombre: t.nombre,
          kind: 'TALLER',
          duracionHoras: t.horas,
          areaId: area.id,
        },
        update: { areaId: area.id, codigo: t.codigo, kind: 'TALLER' },
      });
      totalTalleres++;
    }
  }

  console.log(`  ${totalCursos} cursos de area y ${totalTalleres} talleres`);

  // --- Proxima edicion del CIM --------------------------------------------
  // El CIM se imparte 3-4 veces al ano. Sembramos la siguiente que caiga en el
  // futuro para que el sitio y el dashboard tengan algo real que mostrar.
  const hoy = new Date();
  const MESES_CIM = [2, 5, 8, 10]; // marzo, junio, septiembre, noviembre

  let anio = hoy.getFullYear();
  let indice = MESES_CIM.findIndex((m) => m > hoy.getMonth());
  if (indice === -1) {
    indice = 0;
    anio += 1;
  }

  // Primer sabado del mes elegido.
  const inicio = new Date(anio, MESES_CIM[indice], 1);
  while (inicio.getDay() !== 6) inicio.setDate(inicio.getDate() + 1);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);

  const clave = `CIM ${anio}-${indice + 1}`;

  const edicion = await prisma.courseEdition.upsert({
    where: { clave },
    create: {
      clave,
      courseId: cim.id,
      fechaInicio: inicio,
      fechaFin: fin,
      cupo: 40,
      costo: 350,
      sede: 'ESIA Zacatenco y Parque Nacional Desierto de los Leones',
      estado: 'INSCRIPCIONES_ABIERTAS',
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
        // Una por semana: asi se dan en la practica, y deja margen para
        // moverlas cuando cae un puente o el clima obliga a intercambiarlas.
        const fechaInicio = new Date(edicion.fechaInicio);
        fechaInicio.setDate(fechaInicio.getDate() + i * 7);
        fechaInicio.setHours(7, 0, 0, 0);
        return {
          editionId: edicion.id,
          areaId: area.id,
          kind: 'SALIDA_1_DIA' as const,
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

  // --- Edición de ejemplo de un curso técnico ------------------------------
  // Muestra el formato de clave (CBER_2026A) y las seis clases de sesión con
  // las que se arma un programa. Sirve de referencia viva del modelo.
  const cber = await prisma.course.findUnique({ where: { slug: 'curso-basico-de-escalada-en-roca' } });

  if (cber) {
    const anioCurso = hoy.getFullYear();
    const claveCber = `${cber.codigo}_${anioCurso}A`;

    const edCber = await prisma.courseEdition.upsert({
      where: { clave: claveCber },
      create: {
        clave: claveCber,
        courseId: cber.id,
        fechaInicio: new Date(anioCurso, 8, 14, 18, 0),
        fechaFin: new Date(anioCurso, 10, 8, 14, 0),
        cupo: 16,
        costo: 1200,
        sede: 'Los Dinamos y ESIA Zacatenco',
        estado: 'INSCRIPCIONES_ABIERTAS',
      },
      update: {},
    });

    const yaTieneProg = await prisma.editionActivity.count({ where: { editionId: edCber.id } });
    if (yaTieneProg === 0) {
      const d = (mes: number, dia: number, h: number, m = 0) => new Date(anioCurso, mes, dia, h, m);
      await prisma.editionActivity.createMany({
        data: [
          { editionId: edCber.id, kind: 'CLASE_TEORICA', titulo: 'Nudos, arneses y cadena de seguridad', fechaInicio: d(8, 14, 18), fechaFin: d(8, 14, 21), lugar: 'Aula 3, ESIA Zacatenco' },
          { editionId: edCber.id, kind: 'CLASE_TEORICA', titulo: 'Aseguramiento y comandos de escalada', fechaInicio: d(8, 21, 18), fechaFin: d(8, 21, 21), lugar: 'Aula 3, ESIA Zacatenco' },
          { editionId: edCber.id, kind: 'SALIDA_1_DIA', titulo: 'Primera salida a roca', fechaInicio: d(8, 27, 7), fechaFin: d(8, 27, 18), lugar: 'Los Dinamos, Magdalena Contreras' },
          { editionId: edCber.id, kind: 'SALIDA_1_DIA', titulo: 'Segunda salida: rapel y limpieza de vía', fechaInicio: d(9, 11, 7), fechaFin: d(9, 11, 18), lugar: 'Los Dinamos' },
          { editionId: edCber.id, kind: 'CAMPAMENTO', titulo: 'Campamento de fin de semana', descripcion: 'Dos días de escalada con pernocta.', fechaInicio: d(9, 24, 6), fechaFin: d(9, 25, 19), lugar: 'Peña de Bernal, Querétaro' },
          { editionId: edCber.id, kind: 'EXAMEN_TEORICO', titulo: 'Examen teórico', fechaInicio: d(10, 2, 18), fechaFin: d(10, 2, 20), lugar: 'Aula 3, ESIA Zacatenco' },
          { editionId: edCber.id, kind: 'EXAMEN_PRACTICO', titulo: 'Examen práctico en pared', fechaInicio: d(10, 7, 7), fechaFin: d(10, 7, 18), lugar: 'Los Dinamos' },
          { editionId: edCber.id, kind: 'PRESENTACION_FINAL', titulo: 'Presentación final y entrega de constancias', fechaInicio: d(10, 8, 11), fechaFin: d(10, 8, 14), lugar: 'Auditorio, ESIA Zacatenco' },
        ],
      });
      console.log(`  Edicion ${claveCber} con 8 sesiones`);
    } else {
      console.log(`  Edicion ${claveCber} (ya tenia programa)`);
    }
  }

  // --- Otras ediciones, para que el calendario muestre su razon de ser ------
  // Se traslapan a proposito: es justo lo que la vista de calendario deja ver
  // para que dos areas no programen encima una de otra.
  const OTRAS_EDICIONES = [
    {
      codigo: 'CBAM', ini: [8, 5], fin: [9, 18], sede: 'Iztaccíhuatl y Nevado de Toluca',
      sesiones: [
        ['CLASE_TEORICA', 'Aclimatación y fisiología de altura', [8, 5], [8, 5]],
        ['SALIDA_1_DIA', 'Ascenso al Nevado de Toluca', [8, 19], [8, 19]],
        ['CAMPAMENTO', 'Campamento de aclimatación en Iztaccíhuatl', [9, 2], [9, 4]],
        ['EXAMEN_PRACTICO', 'Examen práctico en alta montaña', [9, 17], [9, 18]],
      ],
    },
    {
      codigo: 'CBE', ini: [8, 12], fin: [9, 10], sede: 'Sótano de las Golondrinas',
      sesiones: [
        ['CLASE_TEORICA', 'Técnica vertical y equipo', [8, 12], [8, 12]],
        ['CAMPAMENTO', 'Exploración en Sótano de las Golondrinas', [8, 26], [8, 28]],
        ['EXAMEN_TEORICO', 'Examen teórico de espeleología', [9, 9], [9, 9]],
      ],
    },
    {
      codigo: 'CBMM', ini: [9, 1], fin: [9, 25], sede: 'Ajusco y Sierra de Guadalupe',
      sesiones: [
        ['SALIDA_1_DIA', 'Travesía Ajusco', [9, 3], [9, 3]],
        ['SALIDA_1_DIA', 'Sierra de Guadalupe', [9, 17], [9, 17]],
      ],
    },
  ] as const;

  const anioEd = hoy.getFullYear();
  let edicionesNuevas = 0;

  for (const e of OTRAS_EDICIONES) {
    const curso = await prisma.course.findFirst({ where: { codigo: e.codigo } });
    if (!curso) continue;

    const clave = `${e.codigo}_${anioEd}A`;
    const ed = await prisma.courseEdition.upsert({
      where: { clave },
      create: {
        clave,
        courseId: curso.id,
        fechaInicio: new Date(anioEd, e.ini[0], e.ini[1], 8),
        fechaFin: new Date(anioEd, e.fin[0], e.fin[1], 18),
        cupo: 14,
        costo: 900,
        sede: e.sede,
        estado: 'INSCRIPCIONES_ABIERTAS',
      },
      update: {},
    });

    if ((await prisma.editionActivity.count({ where: { editionId: ed.id } })) === 0) {
      await prisma.editionActivity.createMany({
        data: e.sesiones.map(([kind, titulo, ini, fin]) => ({
          editionId: ed.id,
          kind,
          titulo,
          fechaInicio: new Date(anioEd, ini[0], ini[1], 8),
          fechaFin: new Date(anioEd, fin[0], fin[1], 18),
        })),
      });
      edicionesNuevas++;
    }
  }
  if (edicionesNuevas > 0) console.log(`  ${edicionesNuevas} ediciones mas, con sus sesiones`);

  // --- Eventos de ejemplo --------------------------------------------------
  // Uno de cada modalidad y visibilidad, para que el calendario y el panel
  // tengan con que trabajar desde el primer arranque.
  const dias = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const areaPorSlug = Object.fromEntries(areas.map((a) => [a.slug, a.id]));

  const EVENTOS = [
    {
      titulo: 'Taller de nudos y aseguramiento',
      descripcion: 'Sesión práctica de nudos básicos, encordamiento y aseguramiento con placa.',
      kind: 'TALLER' as const,
      modalidad: 'PRESENCIAL' as const,
      lugar: 'Explanada de la ESIA Zacatenco',
      fechaInicio: dias(12),
      areaId: areaPorSlug['escalada-en-roca'],
      visibilidad: 'PUBLICO' as const,
      publicado: true,
      cupo: 25,
      costo: 0,
    },
    {
      titulo: 'Charla en línea: preparación para alta montaña',
      descripcion: 'Aclimatación, mal agudo de montaña y armado de mochila para 5,000 m.',
      kind: 'CURSO' as const,
      modalidad: 'EN_LINEA' as const,
      urlVideoconferencia: 'https://meet.google.com/aemipn-alta-montana',
      fechaInicio: dias(20),
      areaId: areaPorSlug['alta-montana'],
      visibilidad: 'PUBLICO' as const,
      publicado: true,
    },
    {
      titulo: 'Rodada de bienvenida al semestre',
      descripcion: 'Rodada de nivel introductorio por la Sierra de Guadalupe. Trae tu bici y casco.',
      kind: 'SALIDA' as const,
      modalidad: 'HIBRIDA' as const,
      lugar: 'Parque Sierra de Guadalupe, entrada Coacalco',
      urlVideoconferencia: 'https://meet.google.com/aemipn-rodada-brief',
      fechaInicio: dias(6),
      areaId: areaPorSlug['ciclismo-de-montana'],
      visibilidad: 'PUBLICO' as const,
      publicado: true,
      cupo: 30,
    },
    {
      titulo: 'Junta de planeación de temporada',
      descripcion: 'Calendario de salidas, presupuesto y compra de equipo del área.',
      kind: 'REUNION' as const,
      modalidad: 'EN_LINEA' as const,
      urlVideoconferencia: 'https://meet.google.com/aemipn-espeleo-junta',
      fechaInicio: dias(4),
      areaId: areaPorSlug['espeleologia'],
      visibilidad: 'AREA' as const,
      publicado: true,
    },
    {
      titulo: 'Asamblea general de la asociación',
      descripcion: 'Informe de la mesa directiva y votación del calendario anual.',
      kind: 'REUNION' as const,
      modalidad: 'PRESENCIAL' as const,
      lugar: 'Auditorio de la ESIA Zacatenco',
      fechaInicio: dias(28),
      areaId: null,
      visibilidad: 'MIEMBROS' as const,
      publicado: true,
    },
  ];

  let eventosNuevos = 0;
  for (const e of EVENTOS) {
    const existe = await prisma.event.findFirst({ where: { titulo: e.titulo } });
    if (!existe) {
      await prisma.event.create({ data: e });
      eventosNuevos++;
    }
  }
  console.log(`  ${eventosNuevos} eventos`);

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
      // Sembrado a mano: no hay correo que confirmar.
      emailVerificadoEn: new Date(),
    },
    update: { role: 'ADMIN', activo: true, emailVerificadoEn: new Date() },
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
