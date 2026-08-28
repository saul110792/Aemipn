import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotificaciones } from '../lib/notificaciones';

/** Campana de la barra superior con el detalle de lo que falta por atender. */
export function Campana() {
  const { data } = useNotificaciones();
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al tocar fuera o al pulsar Escape.
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierta]);

  const total = data?.total ?? 0;
  const pendientes = data?.pendientes ?? [];

  return (
    <div className="campana" ref={caja}>
      <button
        type="button"
        className="campana-boton"
        aria-expanded={abierta}
        aria-label={total > 0 ? `Notificaciones: ${total} pendientes` : 'Notificaciones: nada pendiente'}
        onClick={() => setAbierta((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8.5a6 6 0 10-12 0c0 5.2-2 6.8-2 6.8h16s-2-1.6-2-6.8" />
          <path d="M13.7 19.3a2 2 0 01-3.4 0" />
        </svg>
        {total > 0 && <span className="campana-conteo">{total > 99 ? '99+' : total}</span>}
      </button>

      {abierta && (
        <div className="campana-panel" role="dialog" aria-label="Pendientes">
          <div className="campana-titulo">
            {total > 0 ? `${total} pendiente${total === 1 ? '' : 's'}` : 'Todo al día'}
          </div>

          {pendientes.length === 0 ? (
            <p className="texto-suave" style={{ margin: 0, fontSize: '0.9rem' }}>
              No hay nada esperando tu revisión.
            </p>
          ) : (
            <ul className="campana-lista">
              {pendientes.map((p) => (
                <li key={p.tipo}>
                  <Link to={p.ruta} onClick={() => setAbierta(false)}>
                    <span className="campana-numero">{p.cantidad}</span>
                    <span>
                      <strong>{p.titulo}</strong>
                      <span className="texto-suave">{p.detalle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
