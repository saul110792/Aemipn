import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Marca } from '../components/Marca';

const enlaces = [
  { to: '/areas', texto: 'Áreas' },
  { to: '/eventos', texto: 'Eventos' },
  { to: '/cim', texto: 'CIM' },
  { to: '/cursos', texto: 'Cursos' },
  { to: '/unete', texto: 'Únete' },
];

export function SitioLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

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
          <div>
            <strong>
              Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional
            </strong>
            <p style={{ marginTop: '0.5rem' }}>
              Ocho disciplinas de montaña · Curso Introductorio al Montañismo (CIM) varias veces al año
            </p>
            <p style={{ marginBottom: 0 }}>
              <Link to="/unete">Quiero unirme</Link> · <Link to="/login">Acceso de miembros</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
