import { Link } from 'react-router-dom';

/**
 * Recordatorio de que el sitio sigue en ajustes, no es la versión final.
 * Se muestra tanto en el panel (logueado) como en la portada (sin sesión).
 */
export function AvisoBeta() {
  return (
    <div className="aviso aviso-info" style={{ marginBottom: '1.25rem' }}>
      Este sitio está en fase de estabilización: no es su versión final, así que puede tener
      ajustes o cambios en camino. Ya está disponible en computadora, Android y iPhone —{' '}
      <Link to="/instalar">instálalo aquí</Link>.
    </div>
  );
}
