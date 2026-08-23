import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { Icono, hayIcono } from '../../components/Icono';
import { useAuth } from '../../lib/auth';

interface AreaConteo extends Area {
  _count: { miembros: number; cursos: number };
}

/**
 * Áreas de la asociación.
 * El código encabeza las claves internas y aparece en los desplegables al dar
 * de alta cursos y ediciones, así que se edita aquí y no en la pestaña de
 * contenido público.
 */
export function AreasPanel() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [codigos, setCodigos] = useState<Record<string, string>>({});
  const [guardado, setGuardado] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<AreaConteo[]>('/areas'),
  });

  useEffect(() => {
    if (data) setCodigos(Object.fromEntries(data.map((a) => [a.id, a.codigo ?? ''])));
  }, [data]);

  const guardar = useMutation({
    mutationFn: async () => {
      // Solo se mandan las áreas cuyo código cambió.
      const cambios = (data ?? []).filter((a) => (a.codigo ?? '') !== (codigos[a.id] ?? '').trim());
      for (const a of cambios) {
        await api.patch(`/areas/${a.id}`, { codigo: codigos[a.id].trim().toUpperCase() || null });
      }
      return cambios.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      setEditando(false);
      if (n > 0) setGuardado(true);
    },
  });

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;

  const normalizados = Object.entries(codigos).map(([id, c]) => ({ id, c: c.trim().toUpperCase() }));
  const repetidos = normalizados
    .filter((x) => x.c)
    .filter((x, _i, arr) => arr.filter((y) => y.c === x.c).length > 1)
    .map((x) => x.id);
  const invalidos = normalizados.filter((x) => x.c && !/^[A-Z0-9]{1,6}$/.test(x.c)).map((x) => x.id);
  const puedeGuardar = repetidos.length === 0 && invalidos.length === 0;

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Áreas</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Las ocho disciplinas. El código identifica al área en los listados internos.
          </p>
        </div>
        {esAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editando && (
              <button type="button" className="btn btn-borde" onClick={() => {
                setCodigos(Object.fromEntries((data ?? []).map((a) => [a.id, a.codigo ?? ''])));
                setEditando(false);
              }}>
                Cancelar
              </button>
            )}
            <button
              type="button"
              className="btn"
              disabled={editando && (!puedeGuardar || guardar.isPending)}
              onClick={() => (editando ? guardar.mutate() : (setEditando(true), setGuardado(false)))}
            >
              {editando ? (guardar.isPending ? 'Guardando…' : 'Guardar códigos') : 'Editar códigos'}
            </button>
          </div>
        )}
      </div>

      {guardar.error != null && <ErrorAviso error={guardar.error} />}
      {guardado && <div className="aviso aviso-ok">Códigos actualizados.</div>}

      {editando && (
        <div className="aviso aviso-info">
          El código va en mayúsculas, hasta 6 caracteres. Cambiarlo <strong>no altera las claves
          de ediciones ya creadas</strong>: esas quedaron escritas cuando se generaron.
        </div>
      )}

      <div className="rejilla rejilla-3">
        {data?.map((a) => {
          const malRepetido = repetidos.includes(a.id);
          const malFormato = invalidos.includes(a.id);
          return (
            <article key={a.id} className="tarjeta">
              <div className="tarjeta-franja" style={{ background: a.color ?? undefined }} />
              <div className="tarjeta-cuerpo">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  {hayIcono(a.slug) && (
                    <span className="medallon" style={{ background: `${a.color ?? '#611232'}1a`, color: a.color ?? 'var(--guinda)', marginBottom: 0, width: 38, height: 38 }}>
                      <Icono nombre={a.slug} />
                    </span>
                  )}
                  {editando ? (
                    <input
                      value={codigos[a.id] ?? ''}
                      maxLength={6}
                      aria-label={`Código de ${a.nombre}`}
                      onChange={(e) => setCodigos({ ...codigos, [a.id]: e.target.value.toUpperCase() })}
                      style={{
                        width: 88, padding: '0.3rem 0.5rem', fontFamily: 'ui-monospace, Menlo, monospace',
                        fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                        border: `1px solid ${malRepetido || malFormato ? 'var(--error)' : 'var(--borde)'}`,
                        borderRadius: 8,
                      }}
                    />
                  ) : a.codigo ? (
                    <code style={{ fontWeight: 700, color: 'var(--guinda)', fontSize: '1.05rem' }}>{a.codigo}</code>
                  ) : (
                    <span className="insignia insignia-ambar">sin código</span>
                  )}
                </div>

                {malRepetido && <div className="error" style={{ fontSize: '0.82rem' }}>Repetido con otra área.</div>}
                {malFormato && <div className="error" style={{ fontSize: '0.82rem' }}>Solo mayúsculas y números, hasta 6.</div>}

                <h3 style={{ fontSize: '1.05rem' }}>{a.nombre}</h3>
                <p className="texto-suave" style={{ fontSize: '0.9rem' }}>{a.descripcion}</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="insignia">
                    <Icono nombre="miembros" />
                    {a._count.miembros} miembros
                  </span>
                  <span className="insignia">
                    <Icono nombre="cursos" />
                    {a._count.cursos} cursos
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
