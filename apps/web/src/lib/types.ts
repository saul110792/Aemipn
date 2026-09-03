/** Tipos compartidos entre el front y la API. Reflejan el schema de Prisma. */

export type GlobalRole = 'ADMIN' | 'STAFF' | 'JEFE_CIM' | 'MIEMBRO' | 'CIM';
/** Los puestos de una mesa de area. MIEMBRO no es uno: es no tener ninguno. */
export type Cargo = 'JEFE_DE_AREA' | 'JEFE_INTERINO' | 'TESORERO';

/** Lo que se puede elegir al asignar: un cargo, o solo la pertenencia. */
export type CargoOMiembro = Cargo | 'MIEMBRO';

/** Un periodo al frente de un area, con principio y fin. */
export interface Jefatura {
  id: string;
  cargo: Cargo;
  areaId: string;
  desde: string;
  /// `null`/ausente = en funciones.
  hasta?: string | null;
  /// El padrón manda la versión corta, sin el área expandida ni los motivos;
  /// la ficha del miembro y el historial del área las traen completas.
  area?: Area;
  asignadoPor?: string | null;
  motivo?: string | null;
  relevadoPor?: string | null;
  motivoRelevo?: string | null;
}
export type MemberStatus = 'ASPIRANTE' | 'ACTIVO' | 'INACTIVO' | 'BAJA';
export type CourseKind = 'CIM' | 'AREA' | 'TALLER' | 'CERTIFICACION';
export type EditionStatus =
  | 'BORRADOR'
  | 'INSCRIPCIONES_ABIERTAS'
  | 'EN_CURSO'
  | 'CONCLUIDA'
  | 'CANCELADA';
export type EnrollmentStatus =
  | 'PREINSCRITO'
  | 'INSCRITO'
  | 'ACREDITADO'
  | 'NO_ACREDITADO'
  | 'DESERTO'
  | 'BAJA';

export interface SessionUser {
  id: string;
  email: string;
  role: GlobalRole;
  memberId: string | null;
  nombre: string | null;
  fotoUrl: string | null;
  /** Cuantas areas encabeza como jefe o tesorero. */
  areasQueEncabeza?: number;
  /** Cuales, para permisos por area especifica (publicar/borrar un evento, etc). */
  areaIdsQueEncabeza?: string[];
}

export interface Area {
  id: string;
  slug: string;
  codigo?: string | null;
  nombre: string;
  descripcion: string | null;
  contenido?: string | null;
  imagenUrl: string | null;
  galeria?: string[];
  color: string | null;
  orden?: number;
  activa?: boolean;
  _count?: { miembros: number; cursos?: number };
}

export interface Member {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  email: string;
  telefono: string | null;
  boleta: string | null;
  escuela: string | null;
  tipoSangre: string | null;
  alergias?: string[];
  padecimientos?: string | null;
  servicioMedico?: string | null;
  numeroAfiliacion?: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
  contactoEmergencia2?: string | null;
  telefonoEmergencia2?: string | null;
  consentimientoDatosSensiblesEn?: string | null;
  status: MemberStatus;
  fechaIngreso: string;
  fotoUrl: string | null;
  /// Pertenencia al area: estable, la da el curso base.
  areas?: { id: string; area: Area; desde?: string; asignadoPor?: string | null; motivo?: string | null }[];
  /// Cargos, presentes y pasados. Van aparte porque son periodos, no un estado.
  /// En el padrón vienen solo los vigentes; en la ficha, todos.
  jefaturas?: Jefatura[];
  edicionesImpartidas?: {
    id: string; clave: string; fechaInicio: string; fechaFin: string; estado: string;
    course: { nombre: string; codigo: string | null; areaId: string | null };
  }[];
  enrollments?: Enrollment[];
  _count?: { enrollments: number };
  /// Cuenta de acceso al panel, si ya tiene una.
  user?: {
    id: string;
    email: string;
    role: string;
    activo: boolean;
    ultimoAcceso: string | null;
    emailVerificadoEn: string | null;
  } | null;
}

export interface Course {
  id: string;
  slug: string;
  codigo: string | null;
  nombre: string;
  kind: CourseKind;
  descripcion: string | null;
  requisitos: string | null;
  duracionHoras: number | null;
  area: Pick<Area, 'nombre' | 'slug' | 'color'> | null;
  ediciones?: CourseEdition[];
}

export interface CourseEdition {
  id: string;
  clave: string;
  fechaInicio: string;
  fechaFin: string;
  inscripcionesCierran?: string | null;
  cupo: number | null;
  sede: string | null;
  estado: EditionStatus;
  lugaresRestantes?: number | null;
  cupoRestante?: number | null;
  course?: Pick<Course, 'nombre' | 'kind' | 'descripcion' | 'requisitos'> & {
    codigo?: string | null;
    area?: Pick<Area, 'nombre' | 'slug' | 'color'> | null;
  };
  actividades?: EditionActivity[];
  inscripciones?: Enrollment[];
  _count?: { inscripciones: number; actividades?: number };
}

export interface EditionActivity {
  id: string;
  kind: ActivityKind;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  lugar: string | null;
  area: Pick<Area, 'nombre' | 'slug' | 'color'> | null;
  responsable?: { nombre: string; apellidoPaterno: string } | null;
  edition?: { clave: string };
}

export interface Enrollment {
  id: string;
  status: EnrollmentStatus;
  fechaInscripcion: string;
  calificacion: string | null;
  member?: Member;
  edition?: CourseEdition;
}

export interface MembershipApplication {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  email: string;
  telefono: string | null;
  escuela: string | null;
  boleta: string | null;
  areasInteres: string[];
  experiencia: string | null;
  mensaje: string | null;
  status: 'NUEVA' | 'EN_REVISION' | 'ACEPTADA' | 'RECHAZADA';
  createdAt: string;
}

export type ActivityKind =
  | 'CLASE_TEORICA'
  | 'SALIDA_1_DIA'
  | 'CAMPAMENTO'
  | 'EXAMEN_TEORICO'
  | 'EXAMEN_PRACTICO'
  | 'PRESENTACION_FINAL'
  | 'OTRA';

export type EventKind = 'CURSO' | 'TALLER' | 'SALIDA' | 'REUNION' | 'CONVOCATORIA' | 'OTRO';
export type EventMode = 'PRESENCIAL' | 'EN_LINEA' | 'HIBRIDA';
export type EventVisibility = 'PUBLICO' | 'MIEMBROS' | 'AREA';

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  contenido?: string | null;
  kind: EventKind;
  modalidad: EventMode;
  lugar: string | null;
  urlVideoconferencia: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  areaId?: string | null;
  area: Pick<Area, 'nombre' | 'slug' | 'color'> | null;
  visibilidad?: EventVisibility;
  publicado?: boolean;
  /// Cuantos confirmaron "voy a asistir", y si quien pregunta ya lo hizo.
  rsvpCount?: number;
  voyAsistir?: boolean;
  imagenUrl: string | null;
  cupo: number | null;
  registroUrl: string | null;
}

export type Tema = 'clasico' | 'aventura' | 'vivido' | 'zafiro';

export interface SiteSettings {
  facebookUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  tema: Tema;
}

export interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string | null;
  imagenUrl: string | null;
  enlaceUrl: string | null;
  enlaceTexto: string | null;
  publicado?: boolean;
  orden?: number;
}

export interface ContactMessage {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  mensaje: string;
  areaId: string | null;
  area: { nombre: string; color: string | null } | null;
  leidoEn: string | null;
  leidoPor: string | null;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  mime: string;
  size: number;
  alt: string | null;
  subidoPor: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}
