import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { etiqueta } from '../lib/format';

export function PanelLayout() {
  const { user, logout, esAdmin } = useAuth();
  const navigate = useNavigate();

  const salir = async () => {
    await logout();
    navigate('/');
  };

  const clase = ({ isActive }: { isActive: boolean }) => (isActive ? 'activo' : '');

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/panel" className="marca">
            AEMIPN
            <span>Panel de gestión</span>
          </Link>
          <div className="nav-links">
            <Link to="/">Ver sitio público</Link>
            <span style={{ opacity: 0.75, fontSize: '0.88rem' }}>
              {user?.nombre ?? user?.email} · {etiqueta(user?.role)}
            </span>
            <button type="button" onClick={salir} className="btn btn-borde btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="panel">
        <aside className="panel-lateral">
          <NavLink to="/panel" end className={clase}>
            Resumen
          </NavLink>

          <div className="grupo">Personas</div>
          <NavLink to="/panel/miembros" className={clase}>
            Miembros
          </NavLink>
          {esAdmin && (
            <NavLink to="/panel/solicitudes" className={clase}>
              Solicitudes de ingreso
            </NavLink>
          )}

          <div className="grupo">Actividad</div>
          <NavLink to="/panel/areas" className={clase}>
            Áreas
          </NavLink>
          <NavLink to="/panel/cursos" className={clase}>
            Cursos
          </NavLink>
          <NavLink to="/panel/ediciones" className={clase}>
            Ediciones y CIM
          </NavLink>
        </aside>

        <section className="panel-contenido">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
