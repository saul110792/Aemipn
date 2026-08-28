import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { CourseEdition } from '../lib/types';
import { ErrorAviso } from './Estado';

/**
 * Cerrar una edición, con dos caminos que no son intercambiables.
 *
 * Borrar es para la que nunca arrancó: se abrió, no hubo interesados y
 * desaparece. Cancelar es para la que sí tuvo gente: conserva inscripciones,
 * programa y calificaciones, porque dentro de un año alguien preguntará qué
 * pasó con esa generación y una edición borrada no responde nada.
 */
export function CancelarEdicion({
  edicion,
  inscritos,
}: {
  edicion: CourseEdition & {
    motivoCancelacion?: string | null;
    canceladaPor?: string | null;
  };
  inscritos: number;
}) {
  const qc = useQueryClient();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [darDeBaja, setDarDeBaja] = useState(true);

  const sePuedeBorrar = inscritos === 0;
  const yaCancelada = edicion.estado === 'CANCELADA';

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['edition', edicion.id] });
    qc.invalidateQueries({ queryKey: ['editions'] });
    qc.invalidateQueries({ queryKey: ['calendario'] });
    qc.invalidateQueries({ queryKey: ['notificaciones'] });
  };

  const cancelar = useMutation({
    mutationFn: () =>
      api.post(`/editions/${edicion.id}/cancelar`, { motivo, darDeBajaInscritos: darDeBaja }),
    onSuccess: () => {
      refrescar();
      setAbierto(false);
    },
  });

  const borrar = useMutation({
    mutationFn: () => api.delete(`/editions/${edicion.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['editions'] });
      qc.invalidateQueries({ queryKey: ['calendario'] });
      navegar('/panel/ediciones');
    },
  });

  if (yaCancelada) {
    return (
      <div className="aviso aviso-error">
        <strong>Edición cancelada.</strong>
        {edicion.motivoCancelacion && <> {edicion.motivoCancelacion}</>}
        {edicion.canceladaPor && (
          <div className="texto-suave" style={{ fontSize: '0.83rem' }}>
            Cancelada por {edicion.canceladaPor}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="tarjeta" style={{ marginTop: '1.5rem' }}>
      <div className="tarjeta-cuerpo">
        <h3>Cerrar esta edición</h3>

        {cancelar.error != null && <ErrorAviso error={cancelar.error} />}
        {borrar.error != null && <ErrorAviso error={borrar.error} />}

        {!abierto ? (
          <>
            <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
              {sePuedeBorrar
                ? 'Nadie se ha inscrito, así que puede borrarse sin dejar rastro. Si ya hubiera gente, habría que cancelarla para conservar su registro.'
                : `Hay ${inscritos} inscripción(es). No se puede borrar: se cancela, y su registro se conserva.`}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-borde btn-sm" onClick={() => setAbierto(true)}>
                Cancelar edición
              </button>

              {sePuedeBorrar && (
                <button
                  type="button"
                  className="btn btn-peligro btn-sm"
                  disabled={borrar.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Borrar ${edicion.clave} y su programa? No queda registro de que existió.`,
                      )
                    ) {
                      borrar.mutate();
                    }
                  }}
                >
                  {borrar.isPending ? 'Borrando…' : 'Borrar edición'}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="campo">
              <label htmlFor="motivo-cancelacion">Motivo *</label>
              <textarea
                id="motivo-cancelacion"
                style={{ minHeight: 70 }}
                value={motivo}
                placeholder="No se reunió el mínimo de participantes. / Desertaron seis de ocho tras la segunda salida."
                onChange={(e) => setMotivo(e.target.value)}
              />
              <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
                Sin el motivo, dentro de un año esta edición no dirá nada.
              </span>
            </div>

            {inscritos > 0 && (
              <label className="casilla" style={{ marginBottom: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={darDeBaja}
                  onChange={(e) => setDarDeBaja(e.target.checked)}
                />
                Dar de baja a quienes siguen inscritos
              </label>
            )}
            {inscritos > 0 && (
              <p className="texto-suave" style={{ fontSize: '0.82rem', marginTop: '-0.4rem' }}>
                Se marcan como baja, no como deserción: no abandonaron, se quedaron sin curso.
                Quien ya aprobó o reprobó conserva su resultado.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-peligro btn-sm"
                disabled={!motivo.trim() || cancelar.isPending}
                onClick={() => cancelar.mutate()}
              >
                {cancelar.isPending ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
              <button type="button" className="btn btn-borde btn-sm" onClick={() => setAbierto(false)}>
                Volver
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
