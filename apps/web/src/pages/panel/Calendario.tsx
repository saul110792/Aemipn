import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { CalendarioAnual } from '../../components/CalendarioAnual';
import { Icono, hayIcono } from '../../components/Icono';
import { fmtFechaHora } from '../../lib/format';
import { descargarICS } from '../../lib/ics';
import {
  DIAS_CORTOS, acomodarSemana, aDia, mismoDia, nombreMes, semanasDelMes, sumarDias,
  type EntradaCalendario, type RespuestaCalendario,
} from '../../lib/calendario';

const GRIS = '#6b7280';

export function Calendario() {
  const hoy = aDia(new Date());
  const navegar = useNavigate();
  const [cursor, setCursor] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() });
  const [vista, setVista] = useState<'mes' | 'anio'>('mes');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [detalle, setDetalle] = useState<EntradaCalendario | null>(null);

  const semanas = useMemo(() => semanasDelMes(cursor.anio, cursor.mes), [cursor]);

  // En vista de año se pide el año completo; en mes, las seis semanas visibles.
  const [desde, hasta] =
    vista === 'anio'
      ? [new Date(cursor.anio, 0, 1), new Date(cursor.anio + 1, 0, 1)]
      : [semanas[0][0], sumarDias(semanas[5][6], 1)];

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => api.get<Area[]>('/areas') });

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendario', desde.toISOString(), hasta.toISOString()],
    queryFn: () =>
      api.get<RespuestaCalendario>(
        `/calendario?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`,
      ),
  });

  const entradas = useMemo(
    () => (data?.entradas ?? []).filter((e) => !areaFiltro || e.area?.id === areaFiltro),
    [data, areaFiltro],
  );

  const mover = (n: number) => {
    if (vista === 'anio') {
      setCursor({ ...cursor, anio: cursor.anio + n });
      return;
    }
    const d = new Date(cursor.anio, cursor.mes + n, 1);
    setCursor({ anio: d.getFullYear(), mes: d.getMonth() });
  };

  // Áreas que de verdad aparecen este mes, para no llenar la leyenda de vacíos.
  const areasPresentes = useMemo(() => {
    const m = new Map<string, { nombre: string; slug: string; color: string | null }>();
    for (const e of entradas) if (e.area) m.set(e.area.id, e.area);
    return [...m.entries()];
  }, [entradas]);

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Calendario de actividades</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Cursos, sesiones y eventos, del color de su área y abarcando lo que duran.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="conmutador" role="group" aria-label="Escala del calendario">
            <button type="button" className={vista === 'mes' ? 'activo' : ''} onClick={() => setVista('mes')}>
              Mes
            </button>
            <button type="button" className={vista === 'anio' ? 'activo' : ''} onClick={() => setVista('anio')}>
              Año
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="btn btn-borde btn-sm" onClick={() => mover(-1)}
              aria-label={vista === 'anio' ? 'Año anterior' : 'Mes anterior'}>‹</button>
            <button type="button" className="btn btn-borde btn-sm"
              onClick={() => setCursor({ anio: hoy.getFullYear(), mes: hoy.getMonth() })}>
              Hoy
            </button>
            <button type="button" className="btn btn-borde btn-sm" onClick={() => mover(1)}
              aria-label={vista === 'anio' ? 'Año siguiente' : 'Mes siguiente'}>›</button>
          </div>
        </div>
      </div>

      <div className="barra-filtros">
        <strong style={{ fontFamily: 'var(--fuente-titulo)', fontSize: '1.15rem', textTransform: 'capitalize', minWidth: 190 }}>
          {vista === 'anio' ? cursor.anio : `${nombreMes(cursor.mes)} ${cursor.anio}`}
        </strong>
        <select value={areaFiltro} onChange={(e) => setAreaFiltro(e.target.value)}>
          <option value="">Todas las áreas</option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        {data && <span className="texto-suave">{entradas.length} actividad(es)</span>}
      </div>

      {data?.vePlaneacion && (
        <div className="aviso aviso-info" style={{ fontSize: '0.88rem' }}>
          Ves también los cursos de las demás áreas, marcados con un borde punteado. Es para
          programar sin encimarse; no incluye los eventos privados de otras áreas.
        </div>
      )}

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      {areasPresentes.length > 0 && (
        <div className="leyenda">
          {areasPresentes.map(([id, a]) => (
            <span key={id} className="leyenda-item">
              <span className="leyenda-color" style={{ background: a.color ?? GRIS }} />
              {hayIcono(a.slug) && <Icono nombre={a.slug} />}
              {a.nombre}
            </span>
          ))}
        </div>
      )}

      {vista === 'anio' && (
        <CalendarioAnual
          anio={cursor.anio}
          entradas={entradas}
          onElegirMes={(mes) => { setCursor({ ...cursor, mes }); setVista('mes'); }}
          onElegirEntrada={setDetalle}
        />
      )}

      {/* Rejilla del mes: para pantalla ancha. */}
      <div className="calendario" style={vista === 'anio' ? { display: 'none' } : undefined}>
        <div className="cal-encabezado">
          {DIAS_CORTOS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {semanas.map((semana, i) => {
          const barras = acomodarSemana(semana, entradas);
          const carriles = barras.length ? Math.max(...barras.map((b) => b.carril)) + 1 : 0;
          return (
            <div key={i} className="cal-semana" style={{ minHeight: 92 + carriles * 22 }}>
              {semana.map((dia) => (
                <div
                  key={dia.toISOString()}
                  className={[
                    'cal-dia',
                    dia.getMonth() !== cursor.mes ? 'fuera' : '',
                    mismoDia(dia, hoy) ? 'hoy' : '',
                  ].join(' ')}
                >
                  <span className="cal-numero">{dia.getDate()}</span>
                </div>
              ))}

              <div className="cal-barras">
                {barras.map((b) => {
                  const color = b.entrada.area?.color ?? GRIS;
                  return (
                    <button
                      key={b.entrada.id}
                      type="button"
                      className={`cal-barra${b.entrada.ajeno ? ' ajena' : ''}${b.entrada.tipo === 'EDICION' ? ' edicion' : ''}`}
                      style={{
                        gridColumn: `${b.desde + 1} / span ${b.ancho}`,
                        gridRow: b.carril + 1,
                        background: b.entrada.tipo === 'EDICION' ? `${color}22` : color,
                        color: b.entrada.tipo === 'EDICION' ? color : '#fff',
                        borderColor: color,
                        borderStartStartRadius: b.continua ? 0 : undefined,
                        borderEndStartRadius: b.continua ? 0 : undefined,
                        borderStartEndRadius: b.sigue ? 0 : undefined,
                        borderEndEndRadius: b.sigue ? 0 : undefined,
                      }}
                      title={`${b.entrada.titulo}${b.entrada.detalle ? ` · ${b.entrada.detalle}` : ''}`}
                      onClick={() => setDetalle(b.entrada)}
                    >
                      {b.continua && '‹ '}
                      {b.entrada.titulo}
                      {b.sigue && ' ›'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agenda: para el teléfono, donde una rejilla de siete columnas no cabe. */}
      <div className="cal-agenda" style={vista === 'anio' ? { display: 'none' } : undefined}>
        {entradas.length === 0 ? (
          <div className="vacio">Nada programado este mes.</div>
        ) : (
          entradas.map((e) => (
            <button key={e.id} type="button" className="cal-agenda-item" onClick={() => setDetalle(e)}>
              <span className="cal-agenda-color" style={{ background: e.area?.color ?? GRIS }} />
              <span>
                <strong>{e.titulo}</strong>
                <span className="texto-suave">
                  {fmtFechaHora(e.inicio)}
                  {e.area ? ` · ${e.area.nombre}` : ''}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      {detalle && (
        <div className="cal-detalle" role="dialog" aria-label={detalle.titulo}>
          <div className="cal-detalle-caja">
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {detalle.area && (
                <span className="insignia" style={{ background: detalle.area.color ?? GRIS, color: '#fff' }}>
                  {hayIcono(detalle.area.slug) && <Icono nombre={detalle.area.slug} />}
                  {detalle.area.nombre}
                </span>
              )}
              {detalle.ajeno && <span className="insignia insignia-ambar">De otra área</span>}
            </div>

            <h3 style={{ marginTop: '0.7rem', marginBottom: '0.3rem' }}>{detalle.titulo}</h3>
            {detalle.detalle && <p className="texto-suave" style={{ marginBottom: '0.5rem' }}>{detalle.detalle}</p>}

            <dl style={{ margin: '0 0 1rem' }}>
              <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Cuándo</dt>
              <dd style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
                {fmtFechaHora(detalle.inicio)}
                {!mismoDia(new Date(detalle.inicio), new Date(detalle.fin)) && (
                  <> — {fmtFechaHora(detalle.fin)}</>
                )}
              </dd>
              {detalle.lugar && (
                <>
                  <dt className="texto-suave" style={{ fontSize: '0.8rem' }}>Dónde</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{detalle.lugar}</dd>
                </>
              )}
            </dl>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!detalle.ajeno && (
                <button type="button" className="btn btn-sm"
                  onClick={() => { const r = detalle.ruta; setDetalle(null); navegar(r); }}>
                  Ver detalle
                </button>
              )}
              <button
                type="button"
                className="btn btn-borde btn-sm"
                onClick={() =>
                  descargarICS({
                    titulo: detalle.titulo,
                    descripcion: detalle.detalle,
                    lugar: detalle.lugar,
                    inicio: detalle.inicio,
                    fin: detalle.fin,
                  })
                }
              >
                <Icono nombre="calendario" /> Agregar a mi calendario
              </button>
              <button type="button" className="btn btn-borde btn-sm" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
          <button type="button" className="cal-detalle-velo" aria-hidden="true" tabIndex={-1}
            onClick={() => setDetalle(null)} />
        </div>
      )}

      <p className="texto-suave" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
        {vista === 'anio'
          ? 'Una fila por área y una barra por actividad. Dos barras apiladas en la misma fila son cosas que se traslapan. Pulsa un mes para verlo en detalle.'
          : 'Las barras claras con borde son la duración completa de una edición; las sólidas, sus sesiones y los eventos.'}{' '}
        <Link to="/panel/ediciones">Programar una edición →</Link>
      </p>
    </>
  );
}
