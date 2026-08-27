import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import type { Area, Evento, EventMode, EventVisibility } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { TarjetaEvento } from '../../components/TarjetaEvento';
import { SelectorImagen } from '../../components/SelectorImagen';
import { Icono } from '../../components/Icono';
import { etiqueta } from '../../lib/format';

const TIPOS = ['CURSO', 'TALLER', 'SALIDA', 'REUNION', 'CONVOCATORIA', 'OTRO'] as const;
const MODALIDADES: EventMode[] = ['PRESENCIAL', 'EN_LINEA', 'HIBRIDA'];
const VISIBILIDADES: EventVisibility[] = ['PUBLICO', 'MIEMBROS', 'AREA'];

interface Formulario {
  titulo: string;
  descripcion: string;
  kind: string;
  modalidad: EventMode;
  lugar: string;
  urlVideoconferencia: string;
  fechaInicio: string;
  fechaFin: string;
  areaId: string;
  visibilidad: EventVisibility;
  publicado: boolean;
  cupo: string;
  registroUrl: string;
}

/** Convierte "" en null y respeta lo que la modalidad no necesita. */
const limpiar = (v: Formulario, imagenUrl: string | null) => ({
  titulo: v.titulo,
  descripcion: v.descripcion || null,
  kind: v.kind,
  modalidad: v.modalidad,
  lugar: v.modalidad === 'EN_LINEA' ? null : v.lugar || null,
  urlVideoconferencia: v.modalidad === 'PRESENCIAL' ? null : v.urlVideoconferencia || null,
  fechaInicio: v.fechaInicio,
  fechaFin: v.fechaFin || null,
  areaId: v.areaId || null,
  visibilidad: v.visibilidad,
  publicado: v.publicado,
  imagenUrl,
  cupo: v.cupo ? Number(v.cupo) : null,
  registroUrl: v.registroUrl || null,
});

export function EventosPanel() {
  const qc = useQueryClient();
  const [creando, setCreando] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [verBiblioteca, setVerBiblioteca] = useState(false);

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => api.get<Area[]>('/areas') });

  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.get<Evento[]>('/events?incluirPasados=true'),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Formulario>({
    defaultValues: { modalidad: 'PRESENCIAL', visibilidad: 'PUBLICO', kind: 'TALLER', publicado: true },
  });

  const modalidad = watch('modalidad');
  const visibilidad = watch('visibilidad');

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['events'] });
    qc.invalidateQueries({ queryKey: ['public'] });
  };

  const crear = useMutation({
    mutationFn: (v: Formulario) => api.post('/events', limpiar(v, imagenUrl)),
    onSuccess: () => {
      refrescar();
      setCreando(false);
      setImagenUrl(null);
      reset();
    },
  });

  const alternarPublicado = useMutation({
    mutationFn: ({ id, publicado }: { id: string; publicado: boolean }) =>
      api.patch(`/events/${id}`, { publicado }),
    onSuccess: refrescar,
  });

  const borrar = useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess: refrescar,
  });

  const ahora = new Date();
  const proximos = data?.filter((e) => new Date(e.fechaFin ?? e.fechaInicio) >= ahora) ?? [];
  const pasados = data?.filter((e) => new Date(e.fechaFin ?? e.fechaInicio) < ahora) ?? [];

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Eventos</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Cursos, talleres, salidas y reuniones. Cada uno decide si lo ve el público, solo los
            miembros, o solo su área.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setCreando((v) => !v)}>
          {creando ? 'Cancelar' : 'Nuevo evento'}
        </button>
      </div>

      {creando && (
        <div className="tarjeta" style={{ marginBottom: '1.5rem' }}>
          <div className="tarjeta-cuerpo">
            <h3>Nuevo evento</h3>
            {crear.error != null && <ErrorAviso error={crear.error} />}

            <form onSubmit={handleSubmit((v) => crear.mutate(v))} noValidate>
              <div className="campo">
                <label htmlFor="e-titulo">Título *</label>
                <input id="e-titulo" {...register('titulo', { required: 'Escribe un título' })} />
                {errors.titulo && <span className="error">{errors.titulo.message}</span>}
              </div>

              <div className="campo">
                <label htmlFor="e-desc">Descripción</label>
                <textarea id="e-desc" maxLength={600} style={{ minHeight: 80 }} {...register('descripcion')} />
              </div>

              <div className="campos-2">
                <div className="campo">
                  <label htmlFor="e-kind">Tipo</label>
                  <select id="e-kind" {...register('kind')}>
                    {TIPOS.map((t) => (
                      <option key={t} value={t}>{etiqueta(t)}</option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="e-area">Área</label>
                  <select id="e-area" {...register('areaId')}>
                    <option value="">Toda la asociación</option>
                    {areas?.map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="e-inicio">Fecha y hora de inicio *</label>
                  <input
                    id="e-inicio"
                    type="datetime-local"
                    {...register('fechaInicio', { required: 'Indica cuándo empieza' })}
                  />
                  {errors.fechaInicio && <span className="error">{errors.fechaInicio.message}</span>}
                </div>

                <div className="campo">
                  <label htmlFor="e-fin">Fecha y hora de fin</label>
                  <input id="e-fin" type="datetime-local" {...register('fechaFin')} />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="e-modalidad">Modalidad</label>
                <select id="e-modalidad" {...register('modalidad')}>
                  {MODALIDADES.map((m) => (
                    <option key={m} value={m}>{etiqueta(m)}</option>
                  ))}
                </select>
              </div>

              {/* Los campos de ubicacion aparecen segun la modalidad elegida. */}
              {modalidad !== 'EN_LINEA' && (
                <div className="campo">
                  <label htmlFor="e-lugar">
                    <Icono nombre="lugar" /> Lugar *
                  </label>
                  <input
                    id="e-lugar"
                    placeholder="Explanada de la ESIA Zacatenco"
                    {...register('lugar', { required: 'Indica el lugar' })}
                  />
                  {errors.lugar && <span className="error">{errors.lugar.message}</span>}
                </div>
              )}

              {modalidad !== 'PRESENCIAL' && (
                <div className="campo">
                  <label htmlFor="e-url">
                    <Icono nombre="video" /> Liga de videoconferencia *
                  </label>
                  <input
                    id="e-url"
                    type="url"
                    placeholder="https://meet.google.com/…"
                    {...register('urlVideoconferencia', { required: 'Indica la liga' })}
                  />
                  {errors.urlVideoconferencia && (
                    <span className="error">{errors.urlVideoconferencia.message}</span>
                  )}
                </div>
              )}

              <div className="campo">
                <label htmlFor="e-vis">Quién puede verlo</label>
                <select id="e-vis" {...register('visibilidad')}>
                  {VISIBILIDADES.map((v) => (
                    <option key={v} value={v}>{etiqueta(v)}</option>
                  ))}
                </select>
                <span className="texto-suave" style={{ fontSize: '0.83rem' }}>
                  {visibilidad === 'PUBLICO' && 'Aparece en el sitio público, sin necesidad de sesión.'}
                  {visibilidad === 'MIEMBROS' && 'Solo lo ven los miembros con sesión iniciada.'}
                  {visibilidad === 'AREA' && 'Solo lo ven los miembros del área elegida arriba. Debes elegir un área.'}
                </span>
              </div>

              <div className="campos-2">
                <div className="campo">
                  <label htmlFor="e-cupo">Cupo</label>
                  <input id="e-cupo" type="number" min="1" {...register('cupo')} />
                </div>
                <div className="campo">
                  <label htmlFor="e-cupo">Cupo</label>
                  <input id="e-cupo" type="number" min="1" {...register('cupo')} />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="e-registro">Liga de registro</label>
                <input id="e-registro" type="url" placeholder="https://forms.gle/…" {...register('registroUrl')} />
              </div>

              <div className="campo">
                <label>Imagen</label>
                {imagenUrl && (
                  <img src={imagenUrl} alt="" style={{ width: 180, borderRadius: 8, marginBottom: '0.5rem' }} />
                )}
                <div>
                  <button type="button" className="btn btn-borde btn-sm" onClick={() => setVerBiblioteca((v) => !v)}>
                    {verBiblioteca ? 'Cerrar biblioteca' : imagenUrl ? 'Cambiar imagen' : 'Elegir imagen'}
                  </button>
                  {imagenUrl && (
                    <button type="button" className="btn btn-borde btn-sm" style={{ marginLeft: '0.4rem' }} onClick={() => setImagenUrl(null)}>
                      Quitar
                    </button>
                  )}
                </div>
                {verBiblioteca && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <SelectorImagen
                      seleccionadas={imagenUrl ? [imagenUrl] : []}
                      onElegir={(url) => setImagenUrl((a) => (a === url ? null : url))}
                    />
                  </div>
                )}
              </div>

              <label className="casilla" style={{ marginBottom: '1rem' }}>
                <input type="checkbox" {...register('publicado')} />
                Publicar de inmediato
              </label>

              <button type="submit" className="btn btn-verde" disabled={crear.isPending}>
                {crear.isPending ? 'Guardando…' : 'Crear evento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}
      {alternarPublicado.error != null && <ErrorAviso error={alternarPublicado.error} />}
      {borrar.error != null && <ErrorAviso error={borrar.error} />}

      {data?.length === 0 && <div className="vacio">Todavía no hay eventos. Crea el primero.</div>}

      {proximos.length > 0 && (
        <>
          <h2>Próximos ({proximos.length})</h2>
          <div className="pila" style={{ marginBottom: '2rem' }}>
            {proximos.map((e) => (
              <div key={e.id}>
                <TarjetaEvento evento={e} mostrarVisibilidad />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-borde btn-sm"
                    onClick={() => alternarPublicado.mutate({ id: e.id, publicado: !e.publicado })}
                  >
                    {e.publicado ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-borde btn-sm"
                    onClick={() => {
                      if (confirm(`¿Borrar «${e.titulo}»?`)) borrar.mutate(e.id);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {pasados.length > 0 && (
        <>
          <h2 className="texto-suave">Pasados ({pasados.length})</h2>
          <div className="pila" style={{ opacity: 0.7 }}>
            {pasados.map((e) => (
              <TarjetaEvento key={e.id} evento={e} mostrarVisibilidad />
            ))}
          </div>
        </>
      )}
    </>
  );
}
