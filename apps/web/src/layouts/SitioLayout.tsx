import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { SiteSettings } from '../lib/types';
import { LogoIPN, Marca } from '../components/Marca';
import { Icono, type NombreIcono } from '../components/Icono';
import { ModalContacto } from '../components/ModalContacto';

const enlaces = [
  { to: '/areas', texto: 'Áreas' },
  { to: '/eventos', texto: 'Eventos' },
  { to: '/cim', texto: 'CIM' },
  { to: '/cursos', texto: 'Cursos' },
  { to: '/unete', texto: 'Únete' },
];

/** Solo se muestra el icono de la red cuyo campo trae URL. */
const REDES: { icono: NombreIcono; campo: keyof SiteSettings; etiqueta: string }[] = [
  { icono: 'facebook', campo: 'facebookUrl', etiqueta: 'Facebook' },
  { icono: 'instagram', campo: 'instagramUrl', etiqueta: 'Instagram' },
  { icono: 'x', campo: 'xUrl', etiqueta: 'X' },
  { icono: 'youtube', campo: 'youtubeUrl', etiqueta: 'YouTube' },
  { icono: 'tiktok', campo: 'tiktokUrl', etiqueta: 'TikTok' },
  { icono: 'whatsapp', campo: 'whatsappUrl', etiqueta: 'WhatsApp' },
];

const TECNOLOGIAS: { nombre: string; icono: NombreIcono }[] = [
  { nombre: 'React', icono: 'react' },
  { nombre: 'Vite', icono: 'vite' },
  { nombre: 'TypeScript', icono: 'typescript' },
  { nombre: 'Node.js', icono: 'nodejs' },
  { nombre: 'Express', icono: 'express' },
  { nombre: 'PostgreSQL', icono: 'postgresql' },
  { nombre: 'Prisma', icono: 'prisma' },
];

export function SitioLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [mostrarContacto, setMostrarContacto] = useState(false);

  const { data: config } = useQuery({
    queryKey: ['public', 'configuracion'],
    queryFn: () => api.get<SiteSettings>('/public/configuracion'),
  });
  const redesActivas = REDES.filter((r) => config?.[r.campo]);

  // Al navegar, el menú desplegable debe cerrarse solo.
  useEffect(() => setAbierto(false), [pathname]);

  // Con el menú abierto no tiene sentido que la página siga desplazándose.
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  return (
    <div className="app">
      <div className="pleca" />
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="marca">
            <Marca />
          </Link>

          <button
            type="button"
            className="nav-boton"
            aria-expanded={abierto}
            aria-controls="menu-principal"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setAbierto((v) => !v)}
          >
            <span className={abierto ? 'hamburguesa abierta' : 'hamburguesa'} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <div id="menu-principal" className={abierto ? 'nav-links abierto' : 'nav-links'}>
            {enlaces.map((e) => (
              <NavLink key={e.to} to={e.to} className={({ isActive }) => (isActive ? 'activo' : '')}>
                {e.texto}
              </NavLink>
            ))}
            <Link to={user ? '/panel' : '/login'} className="btn btn-verde btn-sm nav-cta">
              {user ? 'Ir al panel' : 'Iniciar sesión'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Velo que cierra el menú al tocar fuera. */}
      {abierto && <button type="button" className="velo" aria-hidden="true" tabIndex={-1} onClick={() => setAbierto(false)} />}

      <main className="crece">
        <Outlet />
      </main>

      <footer className="pie">
        <div className="contenedor pie-inner">
          <div className="pie-texto">
            <strong>
              Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional
            </strong>
            <p style={{ marginTop: '0.5rem' }}>
              Ocho disciplinas de montaña · Curso Introductorio al Montañismo (CIM) varias veces al año
            </p>
            <p style={{ marginBottom: redesActivas.length ? '0.9rem' : 0 }}>
              <Link to="/unete">Quiero unirme</Link> · <Link to="/login">Acceso de miembros</Link>{' '}
              · <button type="button" className="enlace-boton" onClick={() => setMostrarContacto(true)}>
                Contáctanos
              </button>{' '}
              · <Link to="/aviso-de-privacidad">Aviso de privacidad</Link>
            </p>

            {redesActivas.length > 0 && (
              <div className="redes-sociales">
                {redesActivas.map((r) => (
                  <a
                    key={r.campo}
                    href={config![r.campo]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={r.etiqueta}
                    title={r.etiqueta}
                  >
                    <Icono nombre={r.icono} className="icono" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* La asociación pertenece al Politécnico: su escudo cierra el pie. */}
          <div className="pie-institucion">
            <LogoIPN />
          </div>
        </div>

        <div
          className="contenedor"
          style={{
            borderTop: '1px solid rgba(255,255,255,.14)',
            marginTop: '1.5rem',
            paddingTop: '1.1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.9rem',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,.55)' }}>
            Desarrollado por Enrique Saúl Ramírez González
          </span>
          <div className="tecnologias">
            {TECNOLOGIAS.map((t) => (
              <span key={t.nombre}>
                <Icono nombre={t.icono} className="icono" />
                {t.nombre}
              </span>
            ))}
          </div>
        </div>
      </footer>

      {mostrarContacto && <ModalContacto onCerrar={() => setMostrarContacto(false)} />}
    </div>
  );
}
