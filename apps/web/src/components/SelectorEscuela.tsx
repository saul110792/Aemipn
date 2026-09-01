import { useMemo, useState } from 'react';
import { ESCUELAS_IPN } from '../lib/catalogos';

/** Compara ignorando acentos y mayúsculas, para que "esia" encuentre "ESIA". */
const normalizar = (t: string) =>
  t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Campo de "escuela o unidad" con sugerencias del catálogo del IPN, agrupadas
 * por nivel, filtradas mientras se escribe.
 *
 * No es una lista cerrada: quien no encuentre la suya puede dejar lo que
 * escribió tal cual, igual que el campo de texto libre que reemplaza.
 */
export function SelectorEscuela({
  id,
  value,
  onChange,
  placeholder = 'Escribe para buscar tu escuela…',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  const grupos = useMemo(() => {
    const t = normalizar(value);
    return ESCUELAS_IPN.map((g) => ({
      ...g,
      escuelas: t ? g.escuelas.filter((e) => normalizar(e).includes(t)) : g.escuelas,
    })).filter((g) => g.escuelas.length > 0);
  }, [value]);

  return (
    <div className="etiquetas">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => window.setTimeout(() => setAbierto(false), 140)}
      />

      {abierto && grupos.length > 0 && (
        <ul className="etiquetas-sugerencias">
          {grupos.map((g) => (
            <li key={g.categoria}>
              <div className="etiquetas-categoria">{g.categoria}</div>
              {g.escuelas.map((e) => (
                <button
                  key={e}
                  type="button"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => {
                    onChange(e);
                    setAbierto(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
