import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFechaHora, fmtRango } from '../../lib/format';
import { Icono, hayIcono } from '../../components/Icono';
import type { CourseEdition, EditionActivity } from '../../lib/types';

interface Resumen {
  miembros: { total: number; porStatus: Record<string, number> };
  areas: { id: string; nombre: string; slug: string; color: string | null; miembros: number }[];
  solicitudesNuevas: number;
  edicionesActivas: CourseEdition[];
  pagosPendientes: number;
  proximasActividades: EditionActivity[];
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Resumen>('/dashboard'),
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;
  if (!data) return null;

  return (
    <>
      <div className="panel-encabezado">
        <h1>Resumen</h1>
      </div>

      <div className="rejilla rejilla-4">
        <Metrica icono="miembros" valor={data.miembros.total} etiqueta="Miembros registrados" />
        <Metrica icono="brujula" valor={data.miembros.porStatus.ACTIVO ?? 0} etiqueta="Activos" />
        <Metrica icono="solicitudes" valor={data.solicitudesNuevas} etiqueta="Solicitudes por revisar" />
        <Metrica icono="pago" valor={data.pagosPendientes} etiqueta="Pagos pendientes" />
      </div>

      {data.solicitudesNuevas > 0 && (
        <div className="aviso aviso-info" style={{ marginTop: '1.25rem' }}>
          Hay {data.solicitudesNuevas} solicitud(es) de ingreso esperando revisión.{' '}
          <Link to="/panel/solicitudes">Revisarlas ahora →</Link>
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Miembros por área</h2>
      <div className="rejilla rejilla-4">
        {data.areas.map((a) => (
          <div key={a.id} className="metrica" style={{ borderLeft: `4px solid ${a.color ?? 'var(--roca)'}` }}>
            <div className="metrica-icono">
              {hayIcono(a.slug) && (
                <span style={{ color: a.color ?? 'var(--guinda)' }}>
                  <Icono nombre={a.slug} className="icono icono-lg" />
                </span>
              )}
              <div>
                <div className="valor" style={{ fontSize: '1.6rem' }}>{a.miembros}</div>
                <div className="etiqueta">{a.nombre}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: '2rem' }}>Ediciones en marcha</h2>
      {data.edicionesActivas.length === 0 ? (
        <div className="vacio">
          No hay ediciones abiertas. <Link to="/panel/ediciones">Crear una →</Link>
        </div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Curso</th>
                <th>Fechas</th>
                <th>Inscritos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.edicionesActivas.map((ed) => (
                <tr key={ed.id}>
                  <td>
                    <Link to={`/panel/ediciones/${ed.id}`}>
                      <strong>{ed.clave}</strong>
                    </Link>
                  </td>
                  <td>{ed.course?.nombre}</td>
                  <td className="texto-suave">{fmtRango(ed.fechaInicio, ed.fechaFin)}</td>
                  <td>
                    {ed._count?.inscripciones ?? 0}
                    {ed.cupo ? ` / ${ed.cupo}` : ''}
                  </td>
                  <td>
                    <Insignia valor={ed.estado} texto={etiqueta(ed.estado)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Próximas salidas</h2>
      {data.proximasActividades.length === 0 ? (
        <div className="vacio">Sin actividades programadas.</div>
      ) : (
        <div className="tabla-envoltura">
          <table>
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Actividad</th>
                <th>Área</th>
                <th>Edición</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {data.proximasActividades.map((a) => (
                <tr key={a.id}>
                  <td className="texto-suave">{fmtFechaHora(a.fechaInicio)}</td>
                  <td>{a.titulo}</td>
                  <td>{a.area?.nombre ?? '—'}</td>
                  <td className="texto-suave">{a.edition?.clave}</td>
                  <td className="texto-suave">
                    {a.responsable ? `${a.responsable.nombre} ${a.responsable.apellidoPaterno}` : 'Sin asignar'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Tarjeta de cifra con icono, para el bloque superior del resumen. */
function Metrica({
  icono,
  valor,
  etiqueta,
}: {
  icono: 'miembros' | 'brujula' | 'solicitudes' | 'pago';
  valor: number;
  etiqueta: string;
}) {
  return (
    <div className="metrica">
      <div className="metrica-icono">
        <span style={{ color: 'var(--guinda-500)' }}>
          <Icono nombre={icono} className="icono icono-lg" />
        </span>
        <div>
          <div className="valor">{valor}</div>
          <div className="etiqueta">{etiqueta}</div>
        </div>
      </div>
    </div>
  );
}
