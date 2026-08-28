/**
 * Convierte la transcripción de una sesión de Claude Code en un Markdown legible.
 *
 * Para qué sirve: llevarse el *razonamiento* a otra cuenta, otra máquina o a
 * alguien más del equipo. El repositorio ya carga el qué —código, migraciones,
 * mensajes de commit, docs—; lo que no carga es el porqué de las decisiones que
 * se discutieron y descartaron.
 *
 * Redacta antes de escribir. Una transcripción cruda lleva contraseñas de
 * semilla, cadenas de conexión y correos, y exportar es justo el momento en que
 * eso deja de estar solo en tu disco.
 *
 *   node scripts/exportar-conversacion.mjs <sesion.jsonl> [salida.md]
 *   node scripts/exportar-conversacion.mjs <sesion.jsonl> --sin-redactar
 *
 * Con --sin-redactar no toca nada. Úsalo solo si el destino es tan privado como
 * tu propia máquina.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Qué se tapa y con qué.
 *
 * Los valores concretos van primero porque son los que de verdad abren algo;
 * los patrones generales atrapan lo que se nos escape.
 */
const REDACCIONES = [
  [/Aemipn2026!/g, '«CONTRASEÑA-ADMIN»'],
  [/Demo2026!/g, '«CONTRASEÑA-DEMO»'],
  [/postgresql:\/\/[^\s"'`\\)]+/g, 'postgresql://«CONEXIÓN»'],
  [/desarrollodigital_claude@ingenes\.com/g, '«CORREO-DEL-USUARIO»'],
  // Cualquier asignación de secreto en un .env, aunque no la conozcamos.
  [/((?:SECRET|PASSWORD|TOKEN|APIKEY|API_KEY)\w*\s*=\s*)["']?[^\s"'\n]{6,}/gi, '$1«REDACTADO»'],
  // Tokens JWT sueltos, que aparecen al depurar sesiones.
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '«JWT»'],
];

function redactar(texto) {
  return REDACCIONES.reduce((t, [re, con]) => t.replace(re, con), texto);
}

/** Aplana el contenido de un mensaje a texto y a una lista de herramientas. */
function leerMensaje(contenido) {
  if (typeof contenido === 'string') return { texto: contenido, herramientas: [] };
  if (!Array.isArray(contenido)) return { texto: '', herramientas: [] };

  const partes = [];
  const herramientas = [];

  for (const bloque of contenido) {
    if (bloque?.type === 'text' && bloque.text) partes.push(bloque.text);
    else if (bloque?.type === 'tool_use') {
      // Solo el nombre y una línea de qué hacía. El volcado completo es lo que
      // infla la transcripción a 26 MB y no aporta nada al leerla.
      const e = bloque.input ?? {};
      const detalle =
        e.description ?? e.file_path ?? e.pattern ?? e.skill ?? e.url ?? e.command?.split('\n')[0] ?? '';
      herramientas.push(`${bloque.name}${detalle ? ` — ${String(detalle).slice(0, 120)}` : ''}`);
    } else if (bloque?.type === 'image') {
      partes.push('_(captura de pantalla)_');
    }
  }

  return { texto: partes.join('\n\n'), herramientas };
}

function main() {
  const [entrada, ...resto] = process.argv.slice(2);
  if (!entrada) {
    console.error('Falta el archivo. Ejemplo:');
    console.error('  node scripts/exportar-conversacion.mjs ~/.claude/projects/<proyecto>/<sesion>.jsonl');
    process.exit(1);
  }

  const sinRedactar = resto.includes('--sin-redactar');
  const salida = resto.find((a) => !a.startsWith('--')) ?? entrada.replace(/\.jsonl$/, '') + '.md';

  const lineas = fs.readFileSync(entrada, 'utf8').split('\n');
  const md = [];
  let turnos = 0;
  let herramientasTotales = 0;
  // Las herramientas de un mismo turno se juntan al final, no intercaladas:
  // leer «Bash, Bash, Edit, Bash» entre párrafos rompe el hilo.
  let pendientes = [];

  const volcarHerramientas = () => {
    if (!pendientes.length) return;
    md.push('<details><summary>' + pendientes.length + ' llamada(s) a herramientas</summary>\n');
    md.push(pendientes.map((h) => `- \`${h}\``).join('\n'));
    md.push('\n</details>\n');
    herramientasTotales += pendientes.length;
    pendientes = [];
  };

  for (const linea of lineas) {
    if (!linea.trim()) continue;
    let j;
    try { j = JSON.parse(linea); } catch { continue; }

    if (j.type === 'user') {
      // No todo lo que llega como "user" lo escribió una persona. Las skills y
      // los recordatorios del sistema se inyectan por el mismo canal y vienen
      // marcados con isMeta; sin filtrarlos, la exportación atribuye a Enrique
      // párrafos que nunca escribió.
      if (j.isMeta || j.sourceToolUseID) continue;

      const { texto } = leerMensaje(j.message?.content);
      // Los resultados de herramientas también llegan como mensajes de usuario.
      if (!texto.trim() || texto.startsWith('<system-reminder>')) continue;
      volcarHerramientas();
      turnos++;
      md.push(`\n## ${turnos}. Enrique\n`);
      md.push(texto.trim());
    } else if (j.type === 'assistant') {
      const { texto, herramientas } = leerMensaje(j.message?.content);
      pendientes.push(...herramientas);
      if (texto.trim()) {
        volcarHerramientas();
        md.push('\n### Claude\n');
        md.push(texto.trim());
      }
    }
  }
  volcarHerramientas();

  const encabezado = [
    '# AEMIPN — bitácora de la sesión',
    '',
    `Exportado el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    `${turnos} intercambios · ${herramientasTotales} llamadas a herramientas (resumidas).`,
    '',
    sinRedactar
      ? '> **Sin redactar.** Este archivo puede contener contraseñas y cadenas de conexión.'
      : '> Contraseñas, cadenas de conexión y correos aparecen como «REDACTADO».',
    '',
    '> El código, las migraciones y las decisiones ya documentadas viven en el',
    '> repositorio. Esto es el razonamiento alrededor: lo que se descartó y por qué.',
    '',
    '---',
  ].join('\n');

  const cuerpo = md.join('\n');
  fs.writeFileSync(salida, encabezado + '\n' + (sinRedactar ? cuerpo : redactar(cuerpo)));

  const kb = (fs.statSync(salida).size / 1024).toFixed(0);
  console.log(`${path.basename(salida)} — ${turnos} intercambios, ${kb} KB`);
  if (!sinRedactar) {
    // Los propios marcadores («CONEXIÓN») vuelven a coincidir con el patrón que
    // los puso, así que la comprobación los excluye o gritaría en falso.
    const escrito = fs.readFileSync(salida, 'utf8').replace(/«[^»]{1,30}»/g, '');
    const quedan = REDACCIONES.filter(([re]) => new RegExp(re.source, re.flags).test(escrito));
    console.log(quedan.length ? `  AVISO: ${quedan.length} patrón(es) siguen apareciendo` : '  Sin secretos conocidos.');
  }
}

main();
