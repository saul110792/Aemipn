import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { etiqueta } from '../lib/format';
import { Marca } from '../components/Marca';
import { Icono } from '../components/Icono';
import { Campana } from '../components/Campana';
import { useNotificaciones } from '../lib/notificaciones';

export function PanelLayout() {
  const { user, logout, esAdmin } = useAuth();
  const { data: pendientes } = useNotificaciones();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);

  // El padron trae datos personales: lo ven la mesa directiva y quien
  // encabeza un area. Un miembro consulta su propio expediente.
  const puedeVerPadron =
    esAdmin || (user?.areasQueEncabeza ?? 0) > 0;
  const mensajesContacto =
    pendientes?.pendientes.find((p) => p.tipo === 'MENSAJES_CONTACTO')?.cantidad ?? 0;
  const navigate = useNavigate();

  const salir = async () => {
    await logout();
    navigate('/');
  };

  const clase = ({ isActive }: { isActive: boolean }) => (isActive ? 'activo' : '');

  // Al navegar, el menu superior (en movil) se cierra solo -- igual que en
  // el sitio publico, sin esto "Salir" quedaba inaccesible en pantalla
  // chica: la regla que oculta .nav-links en movil esperaba este boton.
  useEffect(() => setAbierto(false), [pathname]);

  return (
    <div className="app">
      <div className="pleca" />
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/panel" className="marca">
            <Marca subtitulo="Panel de gestión" />
          </Link>

          <button
            type="button"
            className="nav-boton"
            aria-expanded={abierto}
            aria-controls="menu-panel"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setAbierto((v) => !v)}
          >
            <span className={abierto ? 'hamburguesa abierta' : 'hamburguesa'} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          <div id="menu-panel" className={abierto ? 'nav-links abierto' : 'nav-links'}>
            <Campana />
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

      {/* Velo que cierra el menú al tocar fuera, igual que en el sitio público. */}
      {abierto && <button type="button" className="velo" aria-hidden="true" tabIndex={-1} onClick={() => setAbierto(false)} />}

      <div className="panel">
        <aside className="panel-lateral">
          <NavLink to="/panel" end className={clase}>
            <Icono nombre="resumen" />
            Resumen
          </NavLink>
          <NavLink to="/panel/perfil" className={clase}>
            <Icono nombre="miembros" />
            Mi expediente
          </NavLink>

          <div className="grupo">Personas</div>
          {puedeVerPadron && (
            <NavLink to="/panel/miembros" className={clase}>
              <Icono nombre="miembros" />
              Miembros
            </NavLink>
          )}
          {/* Aparece para quien tenga algo que validar, sea jefe o mesa directiva. */}
          {(esAdmin || (pendientes?.declaraciones ?? 0) > 0) && (
            <NavLink to="/panel/validaciones" className={clase}>
              <Icono nombre="solicitudes" />
              Validar cursos
              {(pendientes?.declaraciones ?? 0) > 0 && (
                <span className="conteo-lateral">{pendientes!.declaraciones}</span>
              )}
            </NavLink>
          )}

          {esAdmin && (
            <NavLink to="/panel/solicitudes" className={clase}>
              <Icono nombre="solicitudes" />
              Solicitudes
              {(pendientes?.solicitudes ?? 0) > 0 && (
                <span className="conteo-lateral" aria-label={`${pendientes!.solicitudes} pendientes`}>
                  {pendientes!.solicitudes}
                </span>
              )}
            </NavLink>
          )}

          <div className="grupo">Actividad</div>
          <NavLink to="/panel/calendario" className={clase}>
            <Icono nombre="calendario" />
            Calendario
          </NavLink>
          <NavLink to="/panel/areas" className={clase}>
            <Icono nombre="areas" />
            Áreas
          </NavLink>
          {/* Lo ve quien manda: la mesa directiva y quien encabeza un área. */}
          {puedeVerPadron && (
            <NavLink to="/panel/jefaturas" className={clase}>
              <Icono nombre="miembros" />
              Jefaturas
            </NavLink>
          )}
          <NavLink to="/panel/cursos" className={clase}>
            <Icono nombre="cursos" />
            Cursos
          </NavLink>
          <NavLink to="/panel/ediciones" className={clase}>
            <Icono nombre="cursos" />
            Ediciones y CIM
          </NavLink>
          <NavLink to="/panel/eventos" className={clase}>
            <Icono nombre="calendario" />
            Eventos
          </NavLink>

          {(esAdmin || puedeVerPadron) && <div className="grupo">Sitio público</div>}
          {esAdmin && (
            <NavLink to="/panel/contenido" className={clase}>
              <Icono nombre="imagen" />
              Textos e imágenes
            </NavLink>
          )}
          {/* Un mensaje sin área es de la mesa directiva; con área, de quien la encabeza. */}
          {(esAdmin || puedeVerPadron) && (
            <NavLink to="/panel/contacto" className={clase}>
              <Icono nombre="whatsapp" />
              Mensajes de contacto
              {mensajesContacto > 0 && <span className="conteo-lateral">{mensajesContacto}</span>}
            </NavLink>
          )}
        </aside>

        <section className="panel-contenido">
          {/* El panel se diseñó para escritorio; en el teléfono se avisa sin bloquear. */}
          <p className="nota-escritorio aviso aviso-info" style={{ fontSize: '0.85rem' }}>
            El panel está pensado para pantalla grande. Aquí funciona, pero las tablas se
            desplazan de lado.
          </p>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
