import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from '../locales/es.json';
import en from '../locales/en.json';

export const IDIOMA_GUARDADO = 'aemipn_idioma';

const guardado = localStorage.getItem(IDIOMA_GUARDADO);

i18next.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  // Español por default: la asociación es del IPN y casi toda su membresía
  // lee en español; inglés queda como segundo idioma, no como detección
  // automática del navegador, que podría sorprender a alguien de aquí.
  lng: guardado === 'en' ? 'en' : 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export function cambiarIdioma(idioma: 'es' | 'en') {
  localStorage.setItem(IDIOMA_GUARDADO, idioma);
  i18next.changeLanguage(idioma);
}

export default i18next;
