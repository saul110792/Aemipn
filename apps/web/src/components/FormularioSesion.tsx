import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ActivityKind } from '../lib/types';
import { ErrorAviso } from './Estado';
import { etiqueta } from '../lib/format';

/** Las piezas con las que se arma el programa de un curso. */
export const TIPOS_SESION: ActivityKind[] = [
  'CLASE_TEORICA',
  'SALIDA_1_DIA',
  'CAMPAMENTO',
  'EXAMEN_TEORICO',
  'EXAMEN_PRACTICO',
  'PRESENTACION_FINAL',
  'OTRA',
];

/** Un campamento dura varios días; el resto normalmente cabe en uno. */
const esMultidia = (k: ActivityKind) => k === 'CAMPAMENTO';

export function FormularioSesion({ editionId, onListo }: { editionId: string; onListo?: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    kind: 'CLASE_TEORICA' as ActivityKind,
    titulo: '',
    descripcion: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    fechaFin: '',
    lugar: '',
  });

  const crear = useMutation({
    mutationFn: () => {
      const inicio = f.horaInicio ? `${f.fecha}T${f.horaInicio}` : `${f.fecha}T08:00`;
      const fin = esMultidia(f.kind)
        ? f.fechaFin
          ? `${f.fechaFin}T${f.horaFin || '18:00'}`
          : null
        : f.horaFin
          ? `${f.fecha}T${f.horaFin}`
          : null;
      return api.post(`/editions/${editionId}/activities`, {
        kind: f.kind,
        titulo: f.titulo,
        descripcion: f.descripcion || null,
        fechaInicio: inicio,
        fechaFin: fin,
        lugar: f.lugar || null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['edition', editionId] });
      setF({ ...f, titulo: '', descripcion: '', lugar: '' });
      onListo?.();
    },
  });

  const listo = f.titulo.trim() && f.fecha;

  return (
    <div style={{ borderTop: '1px solid var(--borde)', paddingTop: '1rem', marginTop: '1rem' }}>
      <h4 style={{ marginTop: 0 }}>Agregar sesión al programa</h4>
      {crear.error != null && <ErrorAviso error={crear.error} />}

      <div className="campo">
        <label>Tipo de sesión</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
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

      <div className="campo">
        <label htmlFor="s-titulo">Título *</label>
        <input
          id="s-titulo"
          value={f.titulo}
          placeholder="Nudos, arneses y cadena de seguridad"
          onChange={(e) => setF({ ...f, titulo: e.target.value })}
        />
      </div>

      <div className="campos-2">
        <div className="campo">
          <label htmlFor="s-fecha">{esMultidia(f.kind) ? 'Primer día *' : 'Fecha *'}</label>
          <input id="s-fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
        </div>

        {esMultidia(f.kind) ? (
          <div className="campo">
            <label htmlFor="s-fechafin">Último día</label>
            <input id="s-fechafin" type="date" value={f.fechaFin} onChange={(e) => setF({ ...f, fechaFin: e.target.value })} />
          </div>
        ) : (
          <div className="campo">
            <label htmlFor="s-lugar2">Lugar</label>
            <input id="s-lugar2" value={f.lugar} placeholder="Aula 3, ESIA Zacatenco"
              onChange={(e) => setF({ ...f, lugar: e.target.value })} />
          </div>
        )}

        <div className="campo">
          <label htmlFor="s-hi">Hora de inicio</label>
          <input id="s-hi" type="time" value={f.horaInicio} onChange={(e) => setF({ ...f, horaInicio: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="s-hf">Hora de fin</label>
          <input id="s-hf" type="time" value={f.horaFin} onChange={(e) => setF({ ...f, horaFin: e.target.value })} />
        </div>
      </div>

      {esMultidia(f.kind) && (
        <div className="campo">
          <label htmlFor="s-lugar">Lugar</label>
          <input id="s-lugar" value={f.lugar} placeholder="Peña de Bernal, Querétaro"
            onChange={(e) => setF({ ...f, lugar: e.target.value })} />
        </div>
      )}

      <div className="campo">
        <label htmlFor="s-desc">Notas</label>
        <textarea id="s-desc" style={{ minHeight: 60 }} value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
      </div>

      <button type="button" className="btn btn-verde btn-sm" disabled={!listo || crear.isPending}
        onClick={() => crear.mutate()}>
        {crear.isPending ? 'Agregando…' : 'Agregar sesión'}
      </button>
    </div>
  );
}
