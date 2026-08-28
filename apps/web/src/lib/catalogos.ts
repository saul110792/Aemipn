/**
 * Catálogos del expediente médico.
 * Refleja a apps/api/src/lib/catalogos.ts, que es la autoridad: la API valida
 * contra su copia. Si cambia una, cambia la otra.
 */

export const TIPOS_DE_SANGRE = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
] as const;

export type TipoDeSangre = (typeof TIPOS_DE_SANGRE)[number];

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

export const LARGO_MAXIMO_ALERGIA = 60;
export const MAXIMO_ALERGIAS = 20;
