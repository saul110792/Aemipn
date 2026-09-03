import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Anuncio, Area, SiteSettings, Tema } from '../../lib/types';
import { Cargando, ErrorAviso } from '../../components/Estado';
import { SelectorImagen } from '../../components/SelectorImagen';
import { Icono, hayIcono, type NombreIcono } from '../../components/Icono';

const REDES: { campo: Exclude<keyof SiteSettings, 'tema'>; icono: NombreIcono; etiqueta: string; placeholder: string }[] = [
  { campo: 'facebookUrl', icono: 'facebook', etiqueta: 'Facebook', placeholder: 'https://facebook.com/…' },
  { campo: 'instagramUrl', icono: 'instagram', etiqueta: 'Instagram', placeholder: 'https://instagram.com/…' },
  { campo: 'xUrl', icono: 'x', etiqueta: 'X (Twitter)', placeholder: 'https://x.com/…' },
  { campo: 'youtubeUrl', icono: 'youtube', etiqueta: 'YouTube', placeholder: 'https://youtube.com/@…' },
  { campo: 'tiktokUrl', icono: 'tiktok', etiqueta: 'TikTok', placeholder: 'https://tiktok.com/@…' },
  { campo: 'whatsappUrl', icono: 'whatsapp', etiqueta: 'WhatsApp', placeholder: 'https://wa.me/52…' },
];

const TEMAS: { valor: Tema; nombre: string; descripcion: string; muestra: string[] }[] = [
  {
    valor: 'clasico',
    nombre: 'Clásico',
    descripcion: 'El guinda institucional del IPN. Formal y sobrio — el de siempre.',
    muestra: ['#3f0b20', '#611232', '#932352', '#f6eaef'],
  },
  {
    valor: 'aventura',
    nombre: 'Aventura',
    descripcion: 'Verde bosque, formas redondeadas y una tipografía cálida. Para exteriores.',
    muestra: ['#16301c', '#2f5233', '#588a5b', '#e9f3e6'],
  },
  {
    valor: 'vivido',
    nombre: 'Vívido',
    descripcion: 'Morado enérgico y tipografía moderna. Dinámico y llamativo.',
    muestra: ['#2b1055', '#5b21b6', '#9061e0', '#f1ebfe'],
  },
];

/**
 * Gestion de contenido: los textos e imagenes que ve el publico.
 * Edita el area elegida y su galeria del carrusel, y las redes sociales del
 * pie del sitio, sin tocar codigo.
 */
export function Contenido() {
  const qc = useQueryClient();
  const [areaId, setAreaId] = useState<string>('');
  const [pestana, setPestana] = useState<'textos' | 'imagenes' | 'anuncios' | 'redes' | 'estilo'>('textos');
  const [guardado, setGuardado] = useState(false);

  const [form, setForm] = useState({ nombre: '', descripcion: '', contenido: '', color: '' });
  const [galeria, setGaleria] = useState<string[]>([]);
  const [portada, setPortada] = useState<string | null>(null);
  const [redes, setRedes] = useState<Record<Exclude<keyof SiteSettings, 'tema'>, string>>({
    facebookUrl: '', instagramUrl: '', xUrl: '', youtubeUrl: '', tiktokUrl: '', whatsappUrl: '',
  });
  const [tema, setTema] = useState<Tema>('clasico');

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
    setTema(config.tema ?? 'clasico');
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

  const guardarEstilo = useMutation({
    mutationFn: () => api.patch('/configuracion', { tema }),
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
  const enAnuncios = pestana === 'anuncios';
  const enEstilo = pestana === 'estilo';
  // Anuncios administra sus propios anuncios uno por uno: el boton de arriba
  // no le aplica, cada tarjeta se guarda o borra por su cuenta.
  const manejaSuPropioGuardado = enRedes || enAnuncios || enEstilo;
  const accionGuardar = enRedes ? guardarRedes : enEstilo ? guardarEstilo : guardar;
  const guardando = accionGuardar.isPending;
  const errorGuardar = accionGuardar.error;

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
        {!enAnuncios && (
          <button
            type="button"
            className="btn"
            onClick={() => accionGuardar.mutate()}
            disabled={guardando || (!manejaSuPropioGuardado && !activa)}
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        )}
      </div>

      {!enAnuncios && errorGuardar != null && <ErrorAviso error={errorGuardar} />}
      {!enAnuncios && guardado && <div className="aviso aviso-ok">Cambios guardados y publicados.</div>}

      {!manejaSuPropioGuardado && (
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
          className={pestana === 'anuncios' ? 'activa' : ''}
          onClick={() => setPestana('anuncios')}
        >
          <Icono nombre="calendario" /> Anuncios
        </button>
        <button
          type="button"
          className={pestana === 'redes' ? 'activa' : ''}
          onClick={() => setPestana('redes')}
        >
          <Icono nombre="instagram" /> Redes sociales
        </button>
        <button
          type="button"
          className={pestana === 'estilo' ? 'activa' : ''}
          onClick={() => setPestana('estilo')}
        >
          <Icono nombre="brujula" /> Estilo
        </button>
      </div>

      {pestana === 'anuncios' ? (
        <TabAnuncios />
      ) : pestana === 'estilo' ? (
        <div className="tarjeta">
          <div className="tarjeta-cuerpo">
            <h3>Estilo de la app</h3>
            <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
              Cambia los colores, la tipografía y las formas de todo el sitio —portada y
              panel— sin tocar código. Se ve así para todos en cuanto guardes.
            </p>
            <div className="rejilla rejilla-3" style={{ marginTop: '1rem' }}>
              {TEMAS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTema(t.valor)}
                  style={{
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: 0,
                    border: tema === t.valor ? `2px solid ${t.muestra[1]}` : '1px solid var(--borde)',
                    borderRadius: 'var(--radio)',
                    overflow: 'hidden',
                    background: 'var(--blanco)',
                    font: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', height: 10 }}>
                    {t.muestra.map((color, i) => (
                      <span key={i} style={{ flex: 1, background: color }} />
                    ))}
                  </div>
                  <div style={{ padding: '0.9rem' }}>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      {t.nombre}
                      {tema === t.valor && <span className="insignia insignia-verde">Activo</span>}
                    </strong>
                    <span className="texto-suave" style={{ fontSize: '0.85rem' }}>
                      {t.descripcion}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : pestana === 'redes' ? (
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

interface AnuncioForm {
  titulo: string;
  descripcion: string;
  imagenUrl: string | null;
  enlaceUrl: string;
  enlaceTexto: string;
  publicado: boolean;
  orden: number;
}

const anuncioVacio: AnuncioForm = {
  titulo: '', descripcion: '', imagenUrl: null, enlaceUrl: '', enlaceTexto: '', publicado: true, orden: 0,
};

/**
 * Anuncios del banner de la portada: felicitaciones, presentaciones de fin
 * de curso, exploraciones — promocional, sin fecha ni lugar como un evento.
 * Cada tarjeta se crea, edita o borra por su cuenta, aparte del resto de
 * pestañas de esta pantalla.
 */
function TabAnuncios() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const [form, setForm] = useState<AnuncioForm>(anuncioVacio);

  const { data: anuncios, isLoading } = useQuery({
    queryKey: ['anuncios'],
    queryFn: () => api.get<Anuncio[]>('/anuncios'),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['anuncios'] });
    qc.invalidateQueries({ queryKey: ['public', 'anuncios'] });
  };

  const cerrar = () => {
    setEditando(null);
    setForm(anuncioVacio);
  };

  const limpiar = (f: AnuncioForm) => ({
    titulo: f.titulo,
    descripcion: f.descripcion || null,
    imagenUrl: f.imagenUrl,
    enlaceUrl: f.enlaceUrl || null,
    enlaceTexto: f.enlaceTexto || null,
    publicado: f.publicado,
    orden: Number.isFinite(f.orden) ? f.orden : 0,
  });

  const crear = useMutation({
    mutationFn: () => api.post('/anuncios', limpiar(form)),
    onSuccess: () => {
      refrescar();
      cerrar();
    },
  });
  const actualizar = useMutation({
    mutationFn: () => api.patch(`/anuncios/${editando}`, limpiar(form)),
    onSuccess: () => {
      refrescar();
      cerrar();
    },
  });
  const borrar = useMutation({
    mutationFn: (id: string) => api.delete(`/anuncios/${id}`),
    onSuccess: refrescar,
  });

  const abrirNuevo = () => {
    setForm({ ...anuncioVacio, orden: anuncios?.length ?? 0 });
    setEditando('nuevo');
  };

  const abrirEditar = (a: Anuncio) => {
    setForm({
      titulo: a.titulo,
      descripcion: a.descripcion ?? '',
      imagenUrl: a.imagenUrl,
      enlaceUrl: a.enlaceUrl ?? '',
      enlaceTexto: a.enlaceTexto ?? '',
      publicado: a.publicado ?? true,
      orden: a.orden ?? 0,
    });
    setEditando(a.id);
  };

  const guardando = crear.isPending || actualizar.isPending;
  const error = crear.error ?? actualizar.error;

  if (isLoading) return <Cargando />;

  return (
    <div className="pila">
      <div className="tarjeta">
        <div className="tarjeta-cuerpo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Anuncios de la portada</h3>
              <p className="texto-suave" style={{ margin: 0, fontSize: '0.9rem' }}>
                Presentaciones de fin de curso, exploraciones u organización: aparecen como banner
                en la portada, público y abierto, aparte de la agenda de eventos. El de menor
                orden sale primero.
              </p>
            </div>
            {editando === null && (
              <button type="button" className="btn btn-sm" onClick={abrirNuevo}>
                Nuevo anuncio
              </button>
            )}
          </div>

          {editando === null && (!anuncios || anuncios.length === 0) && (
            <div className="vacio" style={{ marginTop: '1rem' }}>Todavía no hay anuncios.</div>
          )}

          {editando === null && anuncios && anuncios.length > 0 && (
            <div className="pila" style={{ marginTop: '1rem' }}>
              {anuncios.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', gap: '1rem', alignItems: 'center',
                    padding: '0.75rem 1rem', border: '1px solid var(--borde)', borderRadius: 'var(--radio)',
                  }}
                >
                  {a.imagenUrl ? (
                    <img src={a.imagenUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: 'var(--arena)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{a.titulo}</strong>{' '}
                    {!a.publicado && <span className="insignia insignia-ambar">Oculto</span>}
                    {a.descripcion && (
                      <p
                        className="texto-suave"
                        style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {a.descripcion}
                      </p>
                    )}
                  </div>
                  <button type="button" className="btn btn-borde btn-sm" onClick={() => abrirEditar(a)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-borde btn-sm"
                    onClick={() => {
                      if (confirm(`¿Borrar «${a.titulo}»?`)) borrar.mutate(a.id);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editando !== null && (
        <div className="tarjeta">
          <div className="tarjeta-cuerpo">
            <h3>{editando === 'nuevo' ? 'Nuevo anuncio' : 'Editar anuncio'}</h3>
            {error != null && <ErrorAviso error={error} />}

            <div className="campo">
              <label htmlFor="a-titulo">Título *</label>
              <input id="a-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>

            <div className="campo">
              <label htmlFor="a-desc">Descripción</label>
              <textarea
                id="a-desc"
                maxLength={400}
                style={{ minHeight: 70 }}
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <div className="campos-2">
              <div className="campo">
                <label htmlFor="a-enlace">Liga — opcional</label>
                <input
                  id="a-enlace"
                  type="url"
                  placeholder="https://…"
                  value={form.enlaceUrl}
                  onChange={(e) => setForm({ ...form, enlaceUrl: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="a-enlace-texto">Texto del botón</label>
                <input
                  id="a-enlace-texto"
                  placeholder="Ver más"
                  value={form.enlaceTexto}
                  onChange={(e) => setForm({ ...form, enlaceTexto: e.target.value })}
                />
              </div>
              <div className="campo">
                <label htmlFor="a-orden">Orden</label>
                <input
                  id="a-orden"
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
                />
              </div>
              <div className="campo" style={{ justifyContent: 'flex-end' }}>
                <label htmlFor="a-publicado" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    id="a-publicado"
                    type="checkbox"
                    checked={form.publicado}
                    onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
                  />
                  Publicado (visible en la portada)
                </label>
              </div>
            </div>

            <div className="campo">
              <label>Imagen del banner — opcional</label>
              <SelectorImagen
                seleccionadas={form.imagenUrl ? [form.imagenUrl] : []}
                onElegir={(url) => setForm({ ...form, imagenUrl: form.imagenUrl === url ? null : url })}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn"
                disabled={guardando || !form.titulo.trim()}
                onClick={() => (editando === 'nuevo' ? crear.mutate() : actualizar.mutate())}
              >
                {guardando ? 'Guardando…' : 'Guardar anuncio'}
              </button>
              <button type="button" className="btn btn-borde" onClick={cerrar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
