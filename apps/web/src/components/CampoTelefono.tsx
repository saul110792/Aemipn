import { useEffect, useState } from 'react';
import { LADAS, LADA_DEFECTO } from '../lib/catalogos';

/** Separa "+52 5541709283" en lada y número. Sin lada reconocible (dato viejo,
 * capturado antes de este campo) se asume México y se toma todo como número. */
function partir(valor: string): { lada: string; numero: string } {
  const t = valor.trim();
  const m = t.match(/^\+(\d{1,3})[\s-]?(.*)$/);
  if (m && LADAS.some((l) => l.codigo === m[1])) {
    return { lada: m[1], numero: m[2].replace(/\D/g, '') };
  }
  return { lada: LADA_DEFECTO, numero: t.replace(/\D/g, '') };
}

/**
 * Teléfono con clave lada aparte, por default México (+52): la asociación
 * es del IPN y casi toda su membresía es de aquí, pero un intercambio o
 * quien viene de otro país puede elegir la suya.
 */
export function CampoTelefono({
  id,
  value,
  onChange,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [lada, setLada] = useState(() => partir(value).lada);
  const [numero, setNumero] = useState(() => partir(value).numero);

  // El valor puede llegar despues (ficha cargando de forma async): re-separa
  // cuando cambia desde fuera. Como se re-emite en el mismo formato que se
  // lee, esto no pelea con lo que la persona ya esta tecleando.
  useEffect(() => {
    const p = partir(value);
    setLada(p.lada);
    setNumero(p.numero);
  }, [value]);

  const emitir = (nuevaLada: string, nuevoNumero: string) => {
    onChange(nuevoNumero ? `+${nuevaLada} ${nuevoNumero}` : '');
  };

  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
      <select
        aria-label="Clave lada"
        value={lada}
        style={{ flex: '0 0 auto', width: 'auto', minWidth: '5.5rem' }}
        onChange={(e) => {
          setLada(e.target.value);
          emitir(e.target.value, numero);
        }}
      >
        {LADAS.map((l) => (
          <option key={l.codigo} value={l.codigo}>
            +{l.codigo} {l.pais}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        placeholder="5541709283"
        required={required}
        value={numero}
        style={{ flex: 1 }}
        onChange={(e) => {
          const limpio = e.target.value.replace(/\D/g, '');
          setNumero(limpio);
          emitir(lada, limpio);
        }}
      />
    </div>
  );
}
