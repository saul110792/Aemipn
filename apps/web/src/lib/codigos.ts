/**
 * Sugerencias de código y slug para el formulario de cursos.
 *
 * `sugerirCodigo` refleja a apps/api/src/lib/claves.ts, que es la autoridad:
 * el servidor rellena el código si el formulario lo manda vacío. Aquí vive una
 * copia para dar respuesta inmediata mientras se escribe, sin ida y vuelta.
 * Si cambia una, cambia la otra.
 */

const MENORES = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'al', 'para', 'con', 'sobre',
]);

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** "Curso Básico de Escalada en Roca" → "CBER" */
export function sugerirCodigo(nombre: string): string {
  return sinAcentos(nombre)
    .split(/[\s-]+/)
    .filter((p) => p && !MENORES.has(p.toLowerCase()))
    .map((p) => p[0].toUpperCase())
    .join('')
    .slice(0, 8);
}

/** "Curso Básico de Escalada en Roca" → "curso-basico-de-escalada-en-roca" */
export function sugerirSlug(nombre: string): string {
  return sinAcentos(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
