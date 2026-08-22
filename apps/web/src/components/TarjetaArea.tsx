import { Link } from 'react-router-dom';
import type { Area } from '../lib/types';
import { Icono, hayIcono } from './Icono';

/** Tarjeta de area con su icono, franja de color y conteo de miembros. */
export function TarjetaArea({ area }: { area: Area }) {
  const color = area.color ?? 'var(--guinda)';

  return (
    <Link to={`/areas/${area.slug}`} className="tarjeta tarjeta-area">
      <div className="tarjeta-franja" style={{ background: color }} />
      <div className="tarjeta-cuerpo">
        {hayIcono(area.slug) && (
          <span className="medallon" style={{ background: `${color}1a`, color }}>
            <Icono nombre={area.slug} className="icono icono-lg" />
          </span>
        )}
        <h3>{area.nombre}</h3>
        <p className="texto-suave" style={{ fontSize: '0.93rem', marginBottom: '0.75rem' }}>
          {area.descripcion}
        </p>
        <span className="insignia">
          <Icono nombre="miembros" />
          {area._count?.miembros ?? 0} miembros
        </span>
      </div>
    </Link>
  );
}
