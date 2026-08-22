import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { SelectorImagen } from '../../components/SelectorImagen';
import { Icono, hayIcono } from '../../components/Icono';

/**
 * Gestion de contenido: los textos e imagenes que ve el publico.
 * Edita el area elegida y su galeria del carrusel sin tocar codigo.
 */
export function Contenido() {
  const qc = useQueryClient();
  const [areaId, setAreaId] = useState<string>('');
  const [pestana, setPestana] = useState<'textos' | 'imagenes'>('textos');
  const [guardado, setGuardado] = useState(false);

  const [form, setForm] = useState({ nombre: '', descripcion: '', contenido: '', color: '' });
  const [galeria, setGaleria] = useState<string[]>([]);
  const [portada, setPortada] = useState<string | null>(null);

  const { data: areas, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
  });

  const activa = areas?.find((a) => a.id === areaId) ?? areas?.[0];

  // Cargar el area elegida en el formulario.
  useEffect(() => {
    if (!activa) return;
    setForm({
      nombre: activa.nombre,
      descripcion: activa.descripcion ?? '',
      contenido: activa.contenido ?? '',
      color: activa.color ?? '#611232',
    });
    setGaleria(activa.galeria ?? []);
    setPortada(activa.imagenUrl ?? null);
    setGuardado(false);
  }, [activa?.id]);

  const guardar = useMutation({
    mutationFn: () =>
      api.patch(`/areas/${activa!.id}`, {
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        contenido: form.contenido || null,
        color: form.color || null,
        imagenUrl: portada,
        galeria,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      setGuardado(true);
    },
  });

  if (isLoading) return <Cargando />;
  if (!areas?.length) return <div className="vacio">No hay áreas registradas.</div>;

  const alternarFoto = (url: string) =>
    setGaleria((g) => (g.includes(url) ? g.filter((x) => x !== url) : [...g, url]));

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Contenido del sitio</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Lo que aquí edites es lo que ve el público en la página del área y en el carrusel.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending || !activa}
        >
          {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {guardar.error != null && <ErrorAviso error={guardar.error} />}
      {guardado && <div className="aviso aviso-ok">Cambios guardados y publicados.</div>}

      <div className="barra-filtros">
        <label htmlFor="area-editar" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Área
        </label>
        <select
          id="area-editar"
          value={activa?.id ?? ''}
          onChange={(e) => setAreaId(e.target.value)}
        >
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        {activa && hayIcono(activa.slug) && (
          <span style={{ color: activa.color ?? 'var(--guinda)' }}>
            <Icono nombre={activa.slug} className="icono icono-lg" />
          </span>
        )}
      </div>

      <div className="pestanas">
        <button
          type="button"
          className={pestana === 'textos' ? 'activa' : ''}
          onClick={() => setPestana('textos')}
        >
          <Icono nombre="texto" /> Textos
        </button>
        <button
          type="button"
          className={pestana === 'imagenes' ? 'activa' : ''}
          onClick={() => setPestana('imagenes')}
        >
          <Icono nombre="imagen" /> Imágenes ({galeria.length})
        </button>
      </div>

      {pestana === 'textos' ? (
        <div className="tarjeta">
          <div className="tarjeta-cuerpo">
            <div className="campo">
              <label htmlFor="c-nombre">Nombre del área</label>
              <input
                id="c-nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="campo">
              <label htmlFor="c-desc">
                Descripción corta
                <span className="texto-suave" style={{ fontWeight: 400 }}>
                  {' '}— aparece en las tarjetas y el carrusel
                </span>
              </label>
              <textarea
                id="c-desc"
                value={form.descripcion}
                maxLength={280}
                style={{ minHeight: 70 }}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
              <span className="texto-suave" style={{ fontSize: '0.8rem' }}>
                {form.descripcion.length}/280
              </span>
            </div>

            <div className="campo">
              <label htmlFor="c-contenido">
                Texto largo
                <span className="texto-suave" style={{ fontWeight: 400 }}>
                  {' '}— el cuerpo de la página del área
                </span>
              </label>
              <textarea
                id="c-contenido"
                value={form.contenido}
                style={{ minHeight: 200 }}
                onChange={(e) => setForm({ ...form, contenido: e.target.value })}
              />
            </div>

            <div className="campo" style={{ maxWidth: 220 }}>
              <label htmlFor="c-color">Color del área</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  id="c-color"
                  type="color"
                  value={form.color}
                  style={{ width: 52, height: 38, padding: 2 }}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="pila">
          <div className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Fotos del carrusel</h3>
              <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
                La primera foto es la que se ve en el carrusel del sitio. Si el área no tiene
                ninguna, se dibuja un panel ilustrado con su color y su icono.
              </p>

              {galeria.length > 0 ? (
                <div className="galeria" style={{ marginBottom: '1rem' }}>
                  {galeria.map((url, i) => (
                    <figure key={url}>
                      <img src={url} alt="" />
                      <div className="acciones">
                        {i > 0 && (
                          <button
                            type="button"
                            title="Mover al principio"
                            onClick={() =>
                              setGaleria([url, ...galeria.filter((x) => x !== url)])
                            }
                          >
                            ★
                          </button>
                        )}
                        <button type="button" onClick={() => alternarFoto(url)}>
                          ✕
                        </button>
                      </div>
                      <figcaption>{i === 0 ? 'Portada' : `Foto ${i + 1}`}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="aviso aviso-info">
                  Este área todavía no tiene fotos. Sube una abajo y pulsa «Usar».
                </div>
              )}
            </div>
          </div>

          <div className="tarjeta">
            <div className="tarjeta-cuerpo">
              <h3>Biblioteca de imágenes</h3>
              <SelectorImagen seleccionadas={galeria} onElegir={alternarFoto} multiple />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
