import { useTranslation } from 'react-i18next';
import { cambiarIdioma } from '../lib/i18n';

/** Selector ES/EN. Vive en la barra del panel; recuerda la elección entre sesiones. */
export function CambiarIdioma() {
  const { t, i18n } = useTranslation();

  return (
    <select
      aria-label={t('idioma.cambiar')}
      value={i18n.language}
      onChange={(e) => cambiarIdioma(e.target.value as 'es' | 'en')}
      className="selector-idioma"
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
}
