/**
 * Claves de edición: <CODIGO>_<AÑO><LETRA>
 *
 *   CBER_2026A  →  Curso Básico de Escalada en Roca, primero de 2026
 *   CBER_2026B  →  el segundo del mismo año
 *
 * La letra avanza con cada edición del mismo curso dentro del año, de modo
 * que la clave sola dice qué curso es, cuándo se dio y en qué orden.
 */

/** 0 → A, 1 → B … 25 → Z, 26 → AA. Sin límite práctico. */
export function letraDeSecuencia(indice: number): string {
  let n = indice;
  let letra = '';
  do {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letra;
}

/** Inversa de letraDeSecuencia: "A" → 0, "B" → 1, "AA" → 26. */
export function secuenciaDeLetra(letra: string): number {
  let n = 0;
  for (const c of letra.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

export const construirClave = (codigo: string, anio: number, indice: number) =>
  `${codigo.toUpperCase()}_${anio}${letraDeSecuencia(indice)}`;

/** Descompone una clave ya existente. null si no sigue el formato. */
export function leerClave(clave: string) {
  const m = /^([A-Z0-9]+)_(\d{4})([A-Z]+)$/.exec(clave.trim().toUpperCase());
  if (!m) return null;
  return { codigo: m[1], anio: Number(m[2]), letra: m[3], indice: secuenciaDeLetra(m[3]) };
}

/**
 * Siguiente letra libre para un curso en un año, a partir de las claves ya usadas.
 * Se apoya en las claves y no en el conteo de filas: si una edición se borra,
 * la letra no se reutiliza y el histórico no se vuelve ambiguo.
 */
export function siguienteClave(codigo: string, anio: number, clavesExistentes: string[]): string {
  const usados = clavesExistentes
    .map(leerClave)
    .filter((c): c is NonNullable<ReturnType<typeof leerClave>> => c !== null)
    .filter((c) => c.codigo === codigo.toUpperCase() && c.anio === anio)
    .map((c) => c.indice);

  const siguiente = usados.length ? Math.max(...usados) + 1 : 0;
  return construirClave(codigo, anio, siguiente);
}

/** Abreviatura sugerida a partir del nombre: "Curso Básico de Escalada en Roca" → CBER. */
export function sugerirCodigo(nombre: string): string {
  const menores = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a', 'al', 'para', 'con', 'sobre']);
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s-]+/)
    .filter((p) => p && !menores.has(p.toLowerCase()))
    .map((p) => p[0].toUpperCase())
    .join('')
    .slice(0, 8);
}
