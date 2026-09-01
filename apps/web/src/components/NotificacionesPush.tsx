import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { activarPush, desactivarPush, soportaPush, suscripcionActual } from '../lib/push';

type Estado = 'cargando' | 'sin-soporte' | 'inactiva' | 'activa';

/**
 * Activa o apaga el push en este dispositivo.
 *
 * Es por dispositivo, no por cuenta: cada celular u computadora en la que
 * alguien lo active guarda su propia suscripción.
 */
export function NotificacionesPush() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!soportaPush()) {
        if (vivo) setEstado('sin-soporte');
        return;
      }
      const suscripcion = await suscripcionActual();
      if (vivo) setEstado(suscripcion ? 'activa' : 'inactiva');
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    setError(null);
    setProcesando(true);
    try {
      await activarPush();
      setEstado('activa');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo activar');
    } finally {
      setProcesando(false);
    }
  };

  const desactivar = async () => {
    setProcesando(true);
    try {
      await desactivarPush();
    } finally {
      setEstado('inactiva');
      setProcesando(false);
    }
  };

  if (estado === 'cargando') return null;

  return (
    <section className="tarjeta" style={{ marginBottom: '1.5rem' }}>
      <div className="tarjeta-cuerpo">
        <h3>Notificaciones</h3>

        {estado === 'sin-soporte' && (
          <p className="texto-suave" style={{ marginBottom: 0 }}>
            Este navegador no admite notificaciones. En iPhone solo funcionan si instalaste la
            app (<Link to="/instalar">ver cómo</Link>); en computadora o Android, ábrelo desde
            Chrome o Edge.
          </p>
        )}

        {estado !== 'sin-soporte' && (
          <>
            <p className="texto-suave">
              Avisa en este dispositivo cuando se publique un evento nuevo en tu área, y un día
              antes de una salida a la que confirmaste asistencia.
            </p>
            {error && <div className="aviso aviso-error">{error}</div>}

            {estado === 'activa' ? (
              <button type="button" className="btn btn-borde" disabled={procesando} onClick={desactivar}>
                {procesando ? 'Desactivando…' : 'Desactivar en este dispositivo'}
              </button>
            ) : (
              <button type="button" className="btn btn-verde" disabled={procesando} onClick={activar}>
                {procesando ? 'Activando…' : 'Activar notificaciones'}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
