import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area, ActivityKind, EditionActivity } from '../lib/types';
import { ErrorAviso } from './Estado';
import { Icono, hayIcono } from './Icono';
import { etiqueta, fmtFecha } from '../lib/format';
import { TIPOS_SESION } from './FormularioSesion';

/** Fecha y hora locales en el formato que espera un input datetime-local. */
function paraCampo(v: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Suma días conservando la hora, para recorrer un puente sin recapturar todo. */
function correr(valor: string, dias: number): string {
  if (!valor) return valor;
  const d = new Date(valor);
  d.setDate(d.getDate() + dias);
  return paraCampo(d.toISOString());
}

/**
 * Edición de una sesión del programa.
 *
 * Se puede cambiar el área además de la fecha porque en la práctica una salida
 * se intercambia por otra: si el cañón viene crecido se va a fotografía, y la
 * sesión sigue siendo la misma casilla del programa.
 */
export function EditarSesion({
  editionId,
  actividad,
  areas,
  programa,
  onListo,
  onCancelar,
}: {
  editionId: string;
  actividad: EditionActivity & { areaId?: string | null; descripcion?: string | null };
  areas: Area[];
  /** El resto del programa, para avisar si la fecha nueva choca con otra sesión. */
  programa: EditionActivity[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    kind: actividad.kind as ActivityKind,
    titulo: actividad.titulo,
    areaId: actividad.areaId ?? '',
    inicio: paraCampo(actividad.fechaInicio),
    fin: paraCampo(actividad.fechaFin),
    lugar: actividad.lugar ?? '',
    descripcion: actividad.descripcion ?? '',
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['edition', editionId] });
    qc.invalidateQueries({ queryKey: ['calendario'] });
  };

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/editions/${editionId}/activities/${actividad.id}`, {
        kind: f.kind,
        titulo: f.titulo,
        areaId: f.areaId || null,
        fechaInicio: f.inicio,
        fechaFin: f.fin || null,
        lugar: f.lugar || null,
        descripcion: f.descripcion || null,
        intercambiarSiChoca: Boolean(choque) && intercambiar,
      }),
    onSuccess: () => {
      refrescar();
      onListo();
    },
  });

  const borrar = useMutation({
    mutationFn: () => api.delete(`/editions/${editionId}/activities/${actividad.id}`),
    onSuccess: () => {
      refrescar();
      onListo();
    },
  });

  const [intercambiar, setIntercambiar] = useState(true);

  const areaElegida = areas.find((a) => a.id === f.areaId) ?? null;

  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  // Qué sesión ocupa ya el día al que se está moviendo esta.
  const choque = useMemo(() => {
    if (!f.inicio) return null;
    const nueva = new Date(f.inicio);
    if (mismoDia(nueva, new Date(actividad.fechaInicio))) return null;
    return programa.find((o) => o.id !== actividad.id && mismoDia(new Date(o.fechaInicio), nueva)) ?? null;
  }, [f.inicio, programa, actividad]);

  /** Mueve inicio y fin a la vez: recorrer una salida no debe descuadrarla. */
  const recorrer = (dias: number) =>
    setF((v) => ({ ...v, inicio: correr(v.inicio, dias), fin: correr(v.fin, dias) }));

  return (
    <div className="editar-sesion">
      {guardar.error != null && <ErrorAviso error={guardar.error} />}
      {borrar.error != null && <ErrorAviso error={borrar.error} />}

      <div className="campo">
        <label>Tipo de sesión</label>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {TIPOS_SESION.map((k) => (
            <button
              key={k}
              type="button"
              className={f.kind === k ? 'btn btn-sm' : 'btn btn-borde btn-sm'}
              onClick={() => setF({ ...f, kind: k })}
            >
              {etiqueta(k)}
            </button>
          ))}
        </div>
      </div>

      <div className="campos-2">
        <div className="campo">
          <label htmlFor={`e-tit-${actividad.id}`}>Título</label>
          <input
            id={`e-tit-${actividad.id}`}
            value={f.titulo}
            onChange={(e) => setF({ ...f, titulo: e.target.value })}
          />
        </div>

        <div className="campo">
          <label htmlFor={`e-area-${actividad.id}`}>
            Área
            <span className="texto-suave" style={{ fontWeight: 400 }}>
              {' '}— cámbiala si se intercambia la actividad
            </span>
          </label>
          <select
            id={`e-area-${actividad.id}`}
            value={f.areaId}
            onChange={(e) => {
              const areaId = e.target.value;
              const area = areas.find((a) => a.id === areaId);
              // Si el título era el genérico del área anterior, sigue al cambio;
              // si alguien lo escribió a mano, no se pisa.
              const generico = /^Salida de /.test(f.titulo);
              setF({
                ...f,
                areaId,
                titulo: generico && area ? `Salida de ${area.nombre}` : f.titulo,
              });
            }}
          >
            <option value="">Sin área (sesión general)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor={`e-ini-${actividad.id}`}>Inicio *</label>
          <input
            id={`e-ini-${actividad.id}`}
            type="datetime-local"
            value={f.inicio}
            onChange={(e) => setF({ ...f, inicio: e.target.value })}
          />
        </div>

        <div className="campo">
          <label htmlFor={`e-fin-${actividad.id}`}>Fin</label>
          <input
            id={`e-fin-${actividad.id}`}
            type="datetime-local"
            value={f.fin}
            onChange={(e) => setF({ ...f, fin: e.target.value })}
          />
        </div>
      </div>

      <div className="campo">
        <label>Recorrer la sesión completa</label>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {[
            [-7, 'Una semana antes'],
            [7, 'Una semana después'],
            [14, 'Dos semanas después'],
          ].map(([dias, texto]) => (
            <button
              key={dias}
              type="button"
              className="btn btn-borde btn-sm"
              onClick={() => recorrer(dias as number)}
            >
              {texto}
            </button>
          ))}
        </div>
        <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
          Para saltar un puente sin volver a capturar la fecha.
        </span>
      </div>

      {choque && (
        <div className="aviso aviso-info" style={{ fontSize: '0.88rem' }}>
          <strong>Ese día ya tiene «{choque.titulo}».</strong>
          <label className="casilla" style={{ marginTop: '0.4rem' }}>
            <input
              type="checkbox"
              checked={intercambiar}
              onChange={(e) => setIntercambiar(e.target.checked)}
            />
            Intercambiarlas
          </label>
          <div className="texto-suave" style={{ fontSize: '0.83rem' }}>
            {intercambiar
              ? '«' + choque.titulo + '» pasará al ' + fmtFecha(actividad.fechaInicio) + ', el hueco que deja esta.'
              : 'Quedarán las dos el mismo día.'}
          </div>
        </div>
      )}

      <div className="campo">
        <label htmlFor={`e-lugar-${actividad.id}`}>Lugar</label>
        <input
          id={`e-lugar-${actividad.id}`}
          value={f.lugar}
          onChange={(e) => setF({ ...f, lugar: e.target.value })}
        />
      </div>

      <div className="campo">
        <label htmlFor={`e-desc-${actividad.id}`}>Notas</label>
        <textarea
          id={`e-desc-${actividad.id}`}
          style={{ minHeight: 56 }}
          value={f.descripcion}
          placeholder="Se movió por el puente del 10 de mayo."
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-verde btn-sm"
          disabled={!f.titulo.trim() || !f.inicio || guardar.isPending}
          onClick={() => guardar.mutate()}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" className="btn btn-borde btn-sm" onClick={onCancelar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-borde btn-sm"
          style={{ marginLeft: 'auto', color: 'var(--error)' }}
          disabled={borrar.isPending}
          onClick={() => {
            if (confirm(`¿Quitar «${actividad.titulo}» del programa?`)) borrar.mutate();
          }}
        >
          Quitar del programa
        </button>
      </div>

      {areaElegida && (
        <p className="texto-suave" style={{ fontSize: '0.82rem', marginTop: '0.6rem', marginBottom: 0 }}>
          {hayIcono(areaElegida.slug) && <Icono nombre={areaElegida.slug} />}
          {' Quedará a cargo de '}
          {areaElegida.nombre}.
        </p>
      )}
    </div>
  );
}
