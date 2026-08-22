/** Tipos compartidos entre el front y la API. Reflejan el schema de Prisma. */

export type GlobalRole = 'ADMIN' | 'STAFF' | 'MIEMBRO';
export type AreaRole = 'JEFE_DE_AREA' | 'TESORERO' | 'MIEMBRO';
export type MemberStatus = 'ASPIRANTE' | 'ACTIVO' | 'INACTIVO' | 'BAJA';
export type CourseKind = 'CIM' | 'TECNICO' | 'CERTIFICACION' | 'TALLER';
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
  | 'BAJA';
export type PaymentStatus = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'EXENTO';

export interface SessionUser {
  id: string;
  email: string;
  role: GlobalRole;
  memberId: string | null;
  nombre: string | null;
  fotoUrl: string | null;
}

export interface Area {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  contenido?: string | null;
  imagenUrl: string | null;
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
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
  status: MemberStatus;
  fechaIngreso: string;
  fotoUrl: string | null;
  areas?: { id: string; role: AreaRole; area: Area }[];
  enrollments?: Enrollment[];
  _count?: { enrollments: number };
}

export interface Course {
  id: string;
  slug: string;
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
  costo: string | number | null;
  sede: string | null;
  estado: EditionStatus;
  lugaresRestantes?: number | null;
  cupoRestante?: number | null;
  course?: Pick<Course, 'nombre' | 'kind' | 'descripcion' | 'requisitos'>;
  actividades?: EditionActivity[];
  inscripciones?: Enrollment[];
  _count?: { inscripciones: number; actividades?: number };
}

export interface EditionActivity {
  id: string;
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
  paymentStatus: PaymentStatus;
  montoPagado: string | number | null;
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

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}
