/** Catálogos cortos y estables del expediente médico. */

/**
 * Los ocho grupos sanguíneos. Se guardan tal cual se leen ("O+"), no como
 * claves con guiones bajos, porque es el mismo texto que se imprime en una
 * lista de salida y traducirlo en cada pantalla solo agrega formas de fallar.
 */
export const TIPOS_DE_SANGRE = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
] as const;

export type TipoDeSangre = (typeof TIPOS_DE_SANGRE)[number];

export const esTipoDeSangre = (v: string): v is TipoDeSangre =>
  (TIPOS_DE_SANGRE as readonly string[]).includes(v);

/**
 * Sugerencias de alergia, no una lista cerrada: son las que más aparecen en
 * un botiquín de montaña o en una comida de campamento. Quien tenga otra la
 * escribe, y por eso el campo acepta texto libre además de estas.
 */
export const ALERGIAS_SUGERIDAS = [
  'Penicilina',
  'Sulfas',
  'Aspirina / AINEs',
  'Ibuprofeno',
  'Paracetamol',
  'Látex',
  'Piquete de abeja o avispa',
  'Mariscos',
  'Nueces y frutos secos',
  'Cacahuate',
  'Lácteos',
  'Gluten',
  'Huevo',
  'Polen',
  'Polvo',
  'Yodo',
] as const;

/** Tope por alergia y por lista, para que el campo no se vuelva un párrafo. */
export const LARGO_MAXIMO_ALERGIA = 60;
export const MAXIMO_ALERGIAS = 20;

/** Compara ignorando acentos y mayúsculas: "látex" y "Latex" son la misma. */
const normalizar = (t: string) =>
  t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Deja la lista lista para guardar: recorta, tira vacíos y quita repetidas
 * comparando sin acentos ni mayúsculas. Se conserva la primera forma escrita,
 * que es como la persona la reconoce.
 */
export function normalizarAlergias(valores: string[]): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const v of valores) {
    const limpio = v.trim();
    if (!limpio) continue;
    const clave = normalizar(limpio);
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    salida.push(limpio);
  }
  return salida;
}
