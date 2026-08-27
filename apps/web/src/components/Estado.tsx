import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';

export const Cargando = ({ texto = 'Cargando…' }: { texto?: string }) => (
  <div className="vacio">{texto}</div>
);

export const Vacio = ({ children }: { children: ReactNode }) => (
  <div className="vacio">{children}</div>
);

export function ErrorAviso({ error }: { error: unknown }) {
  const mensaje =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Ocurrió un error inesperado';

  const detalles = error instanceof ApiError ? error.detalles : undefined;

  return (
    <div className="aviso aviso-error">
      <strong>{mensaje}</strong>
      {detalles && detalles.length > 0 && (
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
          {detalles.map((d) => (
            <li key={d.campo}>
              <code>{d.campo}</code>: {d.mensaje}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Insignia coloreada segun el estado que recibe. */
export function Insignia({ valor, texto }: { valor: string; texto: string }) {
  const verde = ['ACTIVO', 'ACREDITADO', 'PAGADO', 'ACEPTADA', 'INSCRIPCIONES_ABIERTAS', 'EXENTO'];
  const ambar = ['ASPIRANTE', 'PREINSCRITO', 'PENDIENTE', 'NUEVA', 'EN_REVISION', 'BORRADOR'];
  const rojo = ['BAJA', 'RECHAZADA', 'CANCELADA', 'NO_ACREDITADO', 'DESERTO'];
  const azul = ['INSCRITO', 'EN_CURSO', 'CIM'];

  const clase = verde.includes(valor)
    ? 'insignia-verde'
    : ambar.includes(valor)
      ? 'insignia-ambar'
      : rojo.includes(valor)
        ? 'insignia-roja'
        : azul.includes(valor)
          ? 'insignia-azul'
          : '';

  return <span className={`insignia ${clase}`}>{texto}</span>;
}
