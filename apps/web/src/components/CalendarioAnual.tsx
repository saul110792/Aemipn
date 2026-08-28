import { useMemo } from 'react';
import { Icono, hayIcono } from './Icono';
import {
  acomodarAnio, aDia, diasEntre, divisionesDeMes, nombreMes,
  type EntradaCalendario,
} from '../lib/calendario';

const GRIS = '#6b7280';
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Vista de año como línea de tiempo, una fila por área.
 *
 * Se eligió esto y no doce calendarios en miniatura porque el año se mira para
 * programar: en un mini-calendario un curso de dos meses es un puñado de días
 * sueltos, mientras que aquí es una barra que se ve chocar con la de al lado.
 */
export function CalendarioAnual({
  anio,
  entradas,
  onElegirMes,
  onElegirEntrada,
}: {
  anio: number;
  entradas: EntradaCalendario[];
  onElegirMes: (mes: number) => void;
  onElegirEntrada: (e: EntradaCalendario) => void;
}) {
  const filas = useMemo(() => acomodarAnio(anio, entradas), [anio, entradas]);
  const meses = useMemo(() => divisionesDeMes(anio), [anio]);

  // Marca de hoy, solo si el año que se mira es el corriente.
  const hoy = aDia(new Date());
  const marcaHoy =
    hoy.getFullYear() === anio
      ? (diasEntre(new Date(anio, 0, 1), hoy) /
          (diasEntre(new Date(anio, 0, 1), new Date(anio, 11, 31)) + 1)) *
        100
      : null;

  if (filas.length === 0) {
    return <div className="vacio">Nada programado en {anio}.</div>;
  }

  return (
    <div className="anio">
      <div className="anio-fila anio-cabecera">
        <div className="anio-etiqueta" />
        <div className="anio-pista">
          {meses.map((m) => (
            <button
              key={m.mes}
              type="button"
              className="anio-mes"
              style={{ left: `${m.izquierda}%`, width: `${m.ancho}%` }}
              onClick={() => onElegirMes(m.mes)}
              title={`Ver ${nombreMes(m.mes)} en detalle`}
            >
              {MESES_CORTOS[m.mes]}
            </button>
          ))}
        </div>
      </div>

      {filas.map((fila, i) => {
        const color = fila.area?.color ?? GRIS;
        return (
          <div className="anio-fila" key={fila.area?.id ?? `sin-area-${i}`}>
            <div className="anio-etiqueta">
              {fila.area && hayIcono(fila.area.slug) && (
                <span style={{ color }}>
                  <Icono nombre={fila.area.slug} />
                </span>
              )}
              <span>{fila.area?.nombre ?? 'Toda la asociación'}</span>
            </div>

            <div className="anio-pista" style={{ minHeight: fila.carriles * 22 + 8 }}>
              {/* Divisiones de mes, para poder ubicar una barra de un vistazo. */}
              {meses.map((m) => (
                <span key={m.mes} className="anio-division" style={{ left: `${m.izquierda}%` }} />
              ))}
              {marcaHoy !== null && (
                <span className="anio-hoy" style={{ left: `${marcaHoy}%` }} title="Hoy" />
              )}

              {fila.tramos.map((t) => (
                <button
                  key={t.entrada.id}
                  type="button"
                  className={`anio-barra${t.entrada.ajeno ? ' ajena' : ''}${t.entrada.tipo === 'EDICION' ? ' edicion' : ''}`}
                  style={{
                    left: `${t.izquierda}%`,
                    width: `${t.ancho}%`,
                    top: t.carril * 22 + 4,
                    background: t.entrada.tipo === 'EDICION' ? color : `${color}cc`,
                    borderColor: color,
                  }}
                  title={`${t.entrada.titulo}${t.entrada.detalle ? ` · ${t.entrada.detalle}` : ''}`}
                  onClick={() => onElegirEntrada(t.entrada)}
                >
                  <span className="anio-barra-texto">
                    {t.continua && '‹ '}
                    {t.entrada.titulo}
                    {t.sigue && ' ›'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
