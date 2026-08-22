import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { SitioLayout } from './layouts/SitioLayout';
import { PanelLayout } from './layouts/PanelLayout';

import { Inicio } from './pages/Inicio';
import { Areas } from './pages/Areas';
import { AreaDetalle } from './pages/AreaDetalle';
import { Cim } from './pages/Cim';
import { Cursos } from './pages/Cursos';
import { Unete } from './pages/Unete';
import { Login } from './pages/Login';

import { Dashboard } from './pages/panel/Dashboard';
import { Miembros } from './pages/panel/Miembros';
import { MiembroDetalle } from './pages/panel/MiembroDetalle';
import { Solicitudes } from './pages/panel/Solicitudes';
import { AreasPanel } from './pages/panel/AreasPanel';
import { CursosPanel } from './pages/panel/CursosPanel';
import { Ediciones } from './pages/panel/Ediciones';
import { EdicionDetalle } from './pages/panel/EdicionDetalle';

/** Bloquea el panel a quien no haya iniciado sesion. */
function RutaPrivada({ children }: { children: React.ReactNode }) {
  const { user, cargando } = useAuth();
  if (cargando) return <div className="vacio">Cargando sesión…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Sitio informativo, abierto al publico */}
      <Route element={<SitioLayout />}>
        <Route index element={<Inicio />} />
        <Route path="areas" element={<Areas />} />
        <Route path="areas/:slug" element={<AreaDetalle />} />
        <Route path="cim" element={<Cim />} />
        <Route path="cursos" element={<Cursos />} />
        <Route path="unete" element={<Unete />} />
        <Route path="login" element={<Login />} />
      </Route>

      {/* Panel de gestion, requiere sesion */}
      <Route
        path="panel"
        element={
          <RutaPrivada>
            <PanelLayout />
          </RutaPrivada>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="miembros" element={<Miembros />} />
        <Route path="miembros/:id" element={<MiembroDetalle />} />
        <Route path="solicitudes" element={<Solicitudes />} />
        <Route path="areas" element={<AreasPanel />} />
        <Route path="cursos" element={<CursosPanel />} />
        <Route path="ediciones" element={<Ediciones />} />
        <Route path="ediciones/:id" element={<EdicionDetalle />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
