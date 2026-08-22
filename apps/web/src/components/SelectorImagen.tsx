import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getAccessToken } from '../lib/api';
import type { MediaAsset } from '../lib/types';
import { ErrorAviso } from './Estado';

/**
 * Biblioteca de imagenes: sube archivos y deja elegir de lo ya subido.
 * La subida va por fetch directo porque manda FormData, no JSON.
 */
export function SelectorImagen({
  seleccionadas = [],
  onElegir,
  multiple = false,
}: {
  seleccionadas?: string[];
  onElegir?: (url: string) => void;
  multiple?: boolean;
}) {
  const qc = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [subiendo, setSubiendo] = useState(false);

  const { data: imagenes } = useQuery({
    queryKey: ['media'],
    queryFn: () => api.get<MediaAsset[]>('/media'),
  });

  const subir = async (archivos: FileList | null) => {
    if (!archivos?.length) return;
    setError(null);
    setSubiendo(true);
    try {
      for (const archivo of Array.from(archivos)) {
        const cuerpo = new FormData();
        cuerpo.append('archivo', archivo);
        const res = await fetch('/api/media', {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: cuerpo,
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? 'No se pudo subir la imagen');
        }
      }
      qc.invalidateQueries({ queryKey: ['media'] });
    } catch (e) {
      setError(e);
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = '';
    }
  };

  const borrar = useMutation({
    mutationFn: (id: string) => api.delete(`/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['media'] }),
  });

  return (
    <div>
      {error != null && <ErrorAviso error={error} />}
      {borrar.error != null && <ErrorAviso error={borrar.error} />}

      <div
        className={encima ? 'zona-soltar encima' : 'zona-soltar'}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); void subir(e.dataTransfer.files); }}
      >
        <p style={{ margin: '0 0 0.6rem' }}>
          {subiendo ? 'Subiendo…' : 'Arrastra una imagen aquí, o'}
        </p>
        <button type="button" className="btn btn-sm" onClick={() => entrada.current?.click()} disabled={subiendo}>
          Elegir archivo
        </button>
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple={multiple}
          hidden
          onChange={(e) => void subir(e.target.files)}
        />
        <p className="texto-suave" style={{ fontSize: '0.8rem', margin: '0.6rem 0 0' }}>
          JPG, PNG, WebP o AVIF · hasta 5 MB
        </p>
      </div>

      {imagenes && imagenes.length > 0 && (
        <div className="galeria" style={{ marginTop: '1rem' }}>
          {imagenes.map((img) => (
            <figure key={img.id} className={seleccionadas.includes(img.url) ? 'elegida' : undefined}>
              <img src={img.url} alt={img.alt ?? ''} />
              <div className="acciones">
                {onElegir && (
                  <button type="button" onClick={() => onElegir(img.url)}>
                    {seleccionadas.includes(img.url) ? 'Quitar' : 'Usar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Borrar esta imagen definitivamente?')) borrar.mutate(img.id);
                  }}
                  title="Borrar del servidor"
                >
                  ✕
                </button>
              </div>
              <figcaption>{Math.round(img.size / 1024)} KB</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
