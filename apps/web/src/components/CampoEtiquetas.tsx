import { useMemo, useRef, useState } from 'react';

/** Compara ignorando acentos y mayúsculas, para no repetir "látex" y "latex". */
const normalizar = (t: string) =>
  t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Campo de varias etiquetas con sugerencias.
 *
 * Las sugerencias son un atajo, no una lista cerrada: lo escrito a mano se
 * acepta igual. En un expediente médico cerrar el catálogo sería peor que
 * dejarlo abierto — la alergia rara es justo la que hay que anotar.
 */
export function CampoEtiquetas({
  id,
  valores,
  sugerencias,
  onCambio,
  placeholder = 'Escribe y pulsa Enter',
  maximo = 20,
  largoMaximo = 60,
}: {
  id: string;
  valores: string[];
  sugerencias: readonly string[];
  onCambio: (v: string[]) => void;
  placeholder?: string;
  maximo?: number;
  largoMaximo?: number;
}) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const yaEsta = (v: string) => valores.some((x) => normalizar(x) === normalizar(v));

  const agregar = (v: string) => {
    const limpio = v.trim().slice(0, largoMaximo);
    if (!limpio || yaEsta(limpio) || valores.length >= maximo) {
      setTexto('');
      return;
    }
    onCambio([...valores, limpio]);
    setTexto('');
  };

  const quitar = (v: string) => onCambio(valores.filter((x) => x !== v));

  const disponibles = useMemo(() => {
    const t = normalizar(texto);
    return sugerencias
      .filter((s) => !yaEsta(s))
      .filter((s) => !t || normalizar(s).includes(t))
      .slice(0, 8);
  }, [texto, valores, sugerencias]);

  const alTeclear = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      agregar(texto);
      return;
    }
    // Retroceso con el campo vacío borra la última, como en cualquier campo de etiquetas.
    if (e.key === 'Backspace' && !texto && valores.length) {
      quitar(valores[valores.length - 1]);
    }
    if (e.key === 'Escape') setAbierto(false);
  };

  const lleno = valores.length >= maximo;

  return (
    <div className="etiquetas">
      {valores.length > 0 && (
        <ul className="etiquetas-lista">
          {valores.map((v) => (
            <li key={v}>
              <span>{v}</span>
              <button type="button" onClick={() => quitar(v)} aria-label={`Quitar ${v}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="etiquetas-entrada">
        <input
          id={id}
          ref={entrada}
          value={texto}
          disabled={lleno}
          placeholder={lleno ? `Máximo ${maximo}` : placeholder}
          maxLength={largoMaximo}
          autoComplete="off"
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => window.setTimeout(() => setAbierto(false), 140)}
          onKeyDown={alTeclear}
        />
        {texto.trim() && !lleno && (
          <button type="button" className="btn btn-sm" onMouseDown={(e) => e.preventDefault()}
            onClick={() => agregar(texto)}>
            Agregar
          </button>
        )}
      </div>

      {abierto && disponibles.length > 0 && !lleno && (
        <ul className="etiquetas-sugerencias">
          {disponibles.map((s) => (
            <li key={s}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => agregar(s)}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
