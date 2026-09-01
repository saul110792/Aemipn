import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, SiteSettings } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { SelectorImagen } from '../../components/SelectorImagen';
import { Icono, hayIcono, type NombreIcono } from '../../components/Icono';

const REDES: { campo: keyof SiteSettings; icono: NombreIcono; etiqueta: string; placeholder: string }[] = [
  { campo: 'facebookUrl', icono: 'facebook', etiqueta: 'Facebook', placeholder: 'https://facebook.com/…' },
  { campo: 'instagramUrl', icono: 'instagram', etiqueta: 'Instagram', placeholder: 'https://instagram.com/…' },
  { campo: 'xUrl', icono: 'x', etiqueta: 'X (Twitter)', placeholder: 'https://x.com/…' },
  { campo: 'youtubeUrl', icono: 'youtube', etiqueta: 'YouTube', placeholder: 'https://youtube.com/@…' },
  { campo: 'tiktokUrl', icono: 'tiktok', etiqueta: 'TikTok', placeholder: 'https://tiktok.com/@…' },
  { campo: 'whatsappUrl', icono: 'whatsapp', etiqueta: 'WhatsApp', placeholder: 'https://wa.me/52…' },
];

/**
 * Gestion de contenido: los textos e imagenes que ve el publico.
 * Edita el area elegida y su galeria del carrusel, y las redes sociales del
 * pie del sitio, sin tocar codigo.
 */
export function Contenido() {
  const qc = useQueryClient();
  const [areaId, setAreaId] = useState<string>('');
  const [pestana, setPestana] = useState<'textos' | 'imagenes' | 'redes'>('textos');
  const [guardado, setGuardado] = useState(false);

  const [form, setForm] = useState({ nombre: '', descripcion: '', contenido: '', color: '' });
  const [galeria, setGaleria] = useState<string[]>([]);
  const [portada, setPortada] = useState<string | null>(null);
  const [redes, setRedes] = useState<Record<keyof SiteSettings, string>>({
    facebookUrl: '', instagramUrl: '', xUrl: '', youtubeUrl: '', tiktokUrl: '', whatsappUrl: '',
  });

  const { data: areas, isLoading } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
  });

  const { data: config } = useQuery({
    queryKey: ['public', 'configuracion'],
    queryFn: () => api.get<SiteSettings>('/public/configuracion'),
  });

  // Cargar las redes sociales guardadas en el formulario.
  useEffect(() => {
    if (!config) return;
    setRedes({
      facebookUrl: config.facebookUrl ?? '',
      instagramUrl: config.instagramUrl ?? '',
      xUrl: config.xUrl ?? '',
      youtubeUrl: config.youtubeUrl ?? '',
      tiktokUrl: config.tiktokUrl ?? '',
      whatsappUrl: config.whatsappUrl ?? '',
    });
  }, [config]);

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

  const guardarRedes = useMutation({
    mutationFn: () =>
      api.patch('/configuracion', {
        facebookUrl: redes.facebookUrl || null,
        instagramUrl: redes.instagramUrl || null,
        xUrl: redes.xUrl || null,
        youtubeUrl: redes.youtubeUrl || null,
        tiktokUrl: redes.tiktokUrl || null,
        whatsappUrl: redes.whatsappUrl || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['public', 'configuracion'] });
      setGuardado(true);
    },
  });

  if (isLoading) return <Cargando />;
  if (!areas?.length) return <div className="vacio">No hay áreas registradas.</div>;

  const alternarFoto = (url: string) =>
    setGaleria((g) => (g.includes(url) ? g.filter((x) => x !== url) : [...g, url]));

  const enRedes = pestana === 'redes';
  const guardando = enRedes ? guardarRedes.isPending : guardar.isPending;
  const errorGuardar = enRedes ? guardarRedes.error : guardar.error;

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Contenido del sitio</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            Lo que aquí edites es lo que ve el público en la página del área, el carrusel y el
            pie del sitio.
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => (enRedes ? guardarRedes.mutate() : guardar.mutate())}
          disabled={guardando || (!enRedes && !activa)}
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      {errorGuardar != null && <ErrorAviso error={errorGuardar} />}
      {guardado && <div className="aviso aviso-ok">Cambios guardados y publicados.</div>}

      {!enRedes && (
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
      )}

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
        <button
          type="button"
          className={pestana === 'redes' ? 'activa' : ''}
          onClick={() => setPestana('redes')}
        >
          <Icono nombre="instagram" /> Redes sociales
        </button>
      </div>

      {pestana === 'redes' ? (
        <div className="tarjeta">
          <div className="tarjeta-cuerpo">
            <h3>Redes sociales</h3>
            <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
              Aparecen en el pie del sitio público, solo las que tengan liga. Deja vacía la que
              no uses.
            </p>
            <div className="campos-2">
              {REDES.map((r) => (
                <div className="campo" key={r.campo}>
                  <label htmlFor={`red-${r.campo}`}>
                    <Icono nombre={r.icono} /> {r.etiqueta}
                  </label>
                  <input
                    id={`red-${r.campo}`}
                    type="url"
                    placeholder={r.placeholder}
                    value={redes[r.campo]}
                    onChange={(e) => setRedes({ ...redes, [r.campo]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : pestana === 'textos' ? (
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
