import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFechaCorta } from '../../lib/format';
import { Icono, hayIcono } from '../../components/Icono';
import { useAuth } from '../../lib/auth';
import type { Area, Cargo } from '../../lib/types';

interface Persona {
  id: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  email: string;
  telefono: string | null;
  boleta: string | null;
  fotoUrl: string | null;
}

interface Periodo {
  id: string;
  cargo: Cargo;
  desde: string;
  hasta: string | null;
  enFunciones: boolean;
  asignadoPor: string | null;
  motivo: string | null;
  relevadoPor: string | null;
  motivoRelevo: string | null;
  member: Persona;
  ediciones: {
    id: string;
    clave: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    course: { nombre: string; codigo: string | null; kind: string };
    impartioEl: boolean;
  }[];
}

/**
 * Quién ha encabezado cada área, desde cuándo y qué se impartió mientras.
 *
 * Existe porque el cargo dejó de ser un campo que se sobrescribe: cada
 * nombramiento abre un periodo y cada relevo lo cierra, así que la pregunta
 * "¿quién era jefe en 2024?" ahora tiene respuesta.
 */
export function Jefaturas() {
  const { esAdmin } = useAuth();
  const [areaId, setAreaId] = useState('');

  const { data: areas, isLoading: cargandoAreas } = useQuery({
    // Solo las que puede abrir: el historial trae datos personales.
    queryKey: ['areas', esAdmin ? 'todas' : 'mias'],
    queryFn: () => api.get<Area[]>(`/areas${esAdmin ? '' : '?queEncabezo=true'}`),
  });

  // Un jefe entra a ver la suya, no a elegir entre ocho.
  const elegida = areaId || areas?.[0]?.id || '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['jefaturas', elegida],
    queryFn: () => api.get<{ periodos: Periodo[] }>(`/areas/${elegida}/historial`),
    enabled: Boolean(elegida),
  });

  if (cargandoAreas) return <Cargando />;
  if (!areas?.length) {
    return <div className="vacio">No tienes áreas que consultar.</div>;
  }

  const area = areas.find((a) => a.id === elegida);
  const enFunciones = data?.periodos.filter((p) => p.enFunciones) ?? [];
  const anteriores = data?.periodos.filter((p) => !p.enFunciones) ?? [];

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Jefaturas</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Quién ha encabezado el área, desde cuándo, y qué se impartió en su periodo.
          </p>
        </div>
        {areas.length > 1 && (
          <select
            aria-label="Área"
            value={elegida}
            onChange={(e) => setAreaId(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo ? `${a.codigo} · ` : ''}{a.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {area && (
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: 0 }}>
          {hayIcono(area.slug) && (
            <span style={{ color: area.color ?? 'var(--guinda)' }}>
              <Icono nombre={area.slug} className="icono icono-lg" />
            </span>
          )}
          {area.nombre}
        </h2>
      )}

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      {data && (
        <>
          <h3 style={{ fontSize: '1rem' }}>En funciones</h3>
          {enFunciones.length === 0 ? (
            <div className="vacio">
              Esta área no tiene jefe en funciones.{' '}
              {esAdmin && <>Nómbralo desde la ficha de un miembro del área.</>}
            </div>
          ) : (
            <div className="rejilla rejilla-2">
              {enFunciones.map((p) => (
                <TarjetaPeriodo key={p.id} periodo={p} esAdmin={esAdmin} />
              ))}
            </div>
          )}

          <h3 style={{ fontSize: '1rem', marginTop: '2rem' }}>
            Periodos anteriores
            {anteriores.length > 0 && (
              <span className="texto-suave" style={{ fontWeight: 400 }}> — {anteriores.length}</span>
            )}
          </h3>
          {anteriores.length === 0 ? (
            <div className="vacio">
              Todavía no hay relevos registrados. Aparecerán aquí en cuanto los haya.
            </div>
          ) : (
            <div className="rejilla rejilla-2">
              {anteriores.map((p) => (
                <TarjetaPeriodo key={p.id} periodo={p} esAdmin={esAdmin} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function TarjetaPeriodo({ periodo: p, esAdmin }: { periodo: Periodo; esAdmin: boolean }) {
  const nombre = `${p.member.nombre} ${p.member.apellidoPaterno} ${p.member.apellidoMaterno ?? ''}`.trim();

  return (
    <div className="tarjeta" style={{ opacity: p.enFunciones ? 1 : 0.88 }}>
      <div className="tarjeta-cuerpo">
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Insignia valor={p.cargo} texto={etiqueta(p.cargo)} />
          {p.enFunciones && <span className="insignia insignia-verde">en funciones</span>}
        </div>

        <h4 style={{ margin: '.6rem 0 .15rem', fontSize: '1.02rem' }}>
          {/* El cargo cuelga de una persona del padrón: se llega a su ficha. */}
          {esAdmin ? <Link to={`/panel/miembros/${p.member.id}`}>{nombre}</Link> : nombre}
        </h4>

        {/* Los datos que hacen que sea alguien y no una cuenta. */}
        <div className="texto-suave" style={{ fontSize: '.83rem' }}>
          {[p.member.boleta && `Boleta ${p.member.boleta}`, p.member.telefono, p.member.email]
            .filter(Boolean)
            .join(' · ')}
        </div>

        <p style={{ margin: '.7rem 0 0', fontSize: '.9rem' }}>
          <strong>{fmtFechaCorta(p.desde)}</strong>
          {' — '}
          {p.hasta ? <strong>{fmtFechaCorta(p.hasta)}</strong> : <em>a la fecha</em>}
        </p>

        {(p.motivo || p.motivoRelevo) && (
          <div className="texto-suave" style={{ fontSize: '.8rem', marginTop: '.3rem' }}>
            {p.motivo && <div>Entró: {p.motivo}{p.asignadoPor ? ` (${p.asignadoPor})` : ''}</div>}
            {p.motivoRelevo && <div>Salió: {p.motivoRelevo}{p.relevadoPor ? ` (${p.relevadoPor})` : ''}</div>}
          </div>
        )}

        <div style={{ marginTop: '.85rem', paddingTop: '.6rem', borderTop: '1px solid var(--borde)' }}>
          <div style={{ fontSize: '.83rem', fontWeight: 600, marginBottom: '.3rem' }}>
            Cursos del periodo
            <span className="texto-suave" style={{ fontWeight: 400 }}> — {p.ediciones.length}</span>
          </div>
          {p.ediciones.length === 0 ? (
            <div className="texto-suave" style={{ fontSize: '.82rem' }}>
              No se abrió ninguna generación en este periodo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {p.ediciones.map((e) => (
                <div key={e.id} style={{ fontSize: '.83rem' }}>
                  <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>{e.clave}</code>
                  {' '}
                  <span className="texto-suave">
                    {fmtFechaCorta(e.fechaInicio)}
                    {/* Encabezar el área y dar el curso no siempre coinciden. */}
                    {e.impartioEl ? ' · lo impartió' : ' · lo impartió alguien más'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
