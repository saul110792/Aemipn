/**
 * Catálogos del expediente médico.
 * Refleja a apps/api/src/lib/catalogos.ts, que es la autoridad: la API valida
 * contra su copia. Si cambia una, cambia la otra.
 */

export const TIPOS_DE_SANGRE = [
  'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-',
] as const;

export type TipoDeSangre = (typeof TIPOS_DE_SANGRE)[number];

/**
 * Instituciones de servicio médico más comunes. No es una lista cerrada
 * -- validada como texto libre en la API, no como enum -- porque hay tantas
 * aseguradoras privadas de gastos médicos mayores que fijarlas de antemano
 * dejaría a la mitad escribiendo "Otro" de todos modos.
 */
export const SERVICIOS_MEDICOS_SUGERIDOS = [
  'IMSS',
  'ISSSTE',
  'PEMEX',
  'Sedena',
  'Semar',
  'Particular / Gastos médicos mayores',
] as const;

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

/**
 * Escuelas y unidades del IPN, agrupadas por nivel, para el selector de
 * "Escuela o unidad" del registro y el alta de miembros.
 *
 * Compilado contra ipn.mx (oferta educativa y ubicación de dependencias). No
 * es una lista cerrada: quien no se encuentre aquí puede escribir su escuela
 * de todos modos, como ya permitía el campo de texto libre.
 */
export const ESCUELAS_IPN: { categoria: string; escuelas: string[] }[] = [
  {
    categoria: 'Nivel superior',
    escuelas: [
      'CICS Unidad Milpa Alta',
      'CICS Unidad Santo Tomás',
      'ENCB — Escuela Nacional de Ciencias Biológicas',
      'ENMyH — Escuela Nacional de Medicina y Homeopatía',
      'ENBA — Escuela Nacional de Biblioteconomía y Archivonomía',
      'ESCA Santo Tomás',
      'ESCA Tepepan',
      'ESCOM — Escuela Superior de Cómputo',
      'ESE — Escuela Superior de Economía',
      'ESEO — Escuela Superior de Enfermería y Obstetricia',
      'ESFM — Escuela Superior de Física y Matemáticas',
      'ESIA Tecamachalco',
      'ESIA Zacatenco',
      'ESIA Ticomán',
      'ESIME Culhuacán',
      'ESIME Ticomán',
      'ESIME Azcapotzalco',
      'ESIME Zacatenco',
      'ESIQIE — Escuela Superior de Ingeniería Química e Industrias Extractivas',
      'ESIT — Escuela Superior de Ingeniería Textil',
      'ESM — Escuela Superior de Medicina',
      'UPIBI — Unidad Profesional Interdisciplinaria de Biotecnología',
      'UPIICSA',
      'UPIITA',
      'UPIEM — Unidad Profesional Interdisciplinaria en Energía y Movilidad',
      'UPIIG — Campus Guanajuato',
      'UPIIH — Campus Hidalgo',
      'UPIIP — Campus Palenque',
      'UPIIT — Campus Tlaxcala',
      'UPIIZ — Campus Zacatecas',
    ],
  },
  {
    categoria: 'Nivel medio superior (vocacionales)',
    escuelas: [
      'CET 1 Walter Cross Buchanan',
      'CECyT 1 Gonzalo Vázquez Vela',
      'CECyT 2 Miguel Bernard',
      'CECyT 3 Estanislao Ramírez Ruiz',
      'CECyT 4 Lázaro Cárdenas',
      'CECyT 5 Benito Juárez',
      'CECyT 6 Miguel Othón de Mendizábal',
      'CECyT 7 Cuauhtémoc',
      'CECyT 8 Narciso Bassols',
      'CECyT 9 Juan de Dios Bátiz',
      'CECyT 10 Carlos Vallejo Márquez',
      'CECyT 11 Wilfrido Massieu',
      'CECyT 12 José María Morelos',
      'CECyT 13 Ricardo Flores Magón',
      'CECyT 14 Luis Enrique Erro',
      'CECyT 15 Diódoro Antúnez Echegaray',
      'CECyT 16 Hidalgo',
      'CECyT 17 León, Guanajuato',
      'CECyT 18 Zacatecas',
      'CECyT 19 Leona Vicario',
      'CECyT 20 Natalia Serdán Alatriste',
    ],
  },
  {
    categoria: 'Posgrado e investigación',
    escuelas: [
      'CBG — Centro de Biotecnología Genómica',
      'CEPROBI — Centro de Desarrollo de Productos Bióticos',
      'CIBA — Centro de Investigación en Biotecnología Aplicada (Tlaxcala)',
      'CIC — Centro de Investigación en Computación',
      'CICATA Altamira',
      'CICATA Legaria',
      'CICATA Querétaro',
      'CICIMAR — Centro Interdisciplinario de Ciencias Marinas (La Paz)',
      'CIDETEC — Centro de Innovación y Desarrollo Tecnológico en Cómputo',
      'CIECAS — Centro de Investigaciones Económicas, Administrativas y Sociales',
      'CIIDIR Durango',
      'CIIDIR Michoacán',
      'CIIDIR Oaxaca',
      'CIIDIR Sinaloa',
      'CIIEMAD — Centro Interdisciplinario de Investigaciones y Estudios sobre Medio Ambiente y Desarrollo',
      'CIITEC — Centro de Investigación e Innovación Tecnológica',
      'CITEDI — Centro de Investigación y Desarrollo de Tecnología Digital (Tijuana)',
      'CNMN — Centro de Nanociencias y Micro y Nanotecnologías',
    ],
  },
  {
    categoria: 'Otra',
    escuelas: ['Externo / otra institución'],
  },
];
