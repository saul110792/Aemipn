import { Link } from 'react-router-dom';
import { Trans } from 'react-i18next';

/**
 * Recordatorio de que el sitio sigue en ajustes, no es la versión final.
 * Se muestra tanto en el panel (logueado) como en la portada (sin sesión).
 */
export function AvisoBeta() {
  return (
    <div className="aviso aviso-info" style={{ marginBottom: '1.25rem' }}>
      <Trans i18nKey="beta.aviso" components={{ link: <Link to="/instalar" /> }} />
    </div>
  );
}
