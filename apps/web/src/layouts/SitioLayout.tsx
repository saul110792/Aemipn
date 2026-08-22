import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Marca } from '../components/Marca';

const enlaces = [
  { to: '/areas', texto: 'Áreas' },
  { to: '/cim', texto: 'CIM' },
  { to: '/cursos', texto: 'Cursos' },
  { to: '/unete', texto: 'Únete' },
];

export function SitioLayout() {
  const { user } = useAuth();

  return (
    <div className="app">
      <div className="pleca" />
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="marca">
            <Marca />
          </Link>
          <div className="nav-links">
            {enlaces.map((e) => (
              <NavLink key={e.to} to={e.to} className={({ isActive }) => (isActive ? 'activo' : '')}>
                {e.texto}
              </NavLink>
            ))}
            <Link to={user ? '/panel' : '/login'} className="btn btn-verde btn-sm">
              {user ? 'Ir al panel' : 'Iniciar sesión'}
            </Link>
          </div>
        </div>
      </nav>

      <main className="crece">
        <Outlet />
      </main>

      <footer className="pie">
        <div className="contenedor">
          <strong style={{ color: '#fff' }}>
            Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional
          </strong>
          <p style={{ marginTop: '0.5rem' }}>
            Ocho disciplinas de montaña · Curso Introductorio al Montañismo (CIM) varias veces al año
          </p>
          <p style={{ marginBottom: 0 }}>
            <Link to="/unete">Quiero unirme</Link> · <Link to="/login">Acceso de miembros</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
