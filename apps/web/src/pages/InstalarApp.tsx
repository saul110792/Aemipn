import { useState } from 'react';

type Sistema = 'iphone' | 'android';

/**
 * Cómo instalar el sitio como app en el celular.
 *
 * iOS nunca ofrece un aviso automático de instalación (a diferencia de
 * Android/Chrome): hay que explicarlo aparte o nadie lo encuentra.
 */
export function InstalarApp() {
  const [sistema, setSistema] = useState<Sistema>('iphone');

  return (
    <>
      <header className="hero" style={{ padding: '3rem 0 2.5rem' }}>
        <div className="contenedor">
          <h1>Instalar la app en tu celular</h1>
          <p>
            El sitio se puede agregar a tu pantalla de inicio como una app: abre directo al
            calendario, sin escribir la dirección cada vez.
          </p>
        </div>
      </header>

      <div className="contenedor seccion" style={{ maxWidth: '760px' }}>
        <div className="conmutador" role="group" aria-label="Elige tu celular" style={{ marginBottom: '1.5rem' }}>
          <button type="button" className={sistema === 'iphone' ? 'activo' : ''} onClick={() => setSistema('iphone')}>
            iPhone
          </button>
          <button type="button" className={sistema === 'android' ? 'activo' : ''} onClick={() => setSistema('android')}>
            Android
          </button>
        </div>

        {sistema === 'iphone' ? (
          <>
            <div className="aviso aviso-info">
              En iPhone no aparece un aviso automático para instalar — hay que agregarla a mano,
              y solo funciona desde <strong>Safari</strong> (no desde Chrome ni otro navegador).
            </div>

            <ol className="pasos-instalar">
              <li>
                Abre este sitio en <strong>Safari</strong> (si estás leyendo esto ya estás en él).
              </li>
              <li>
                Toca el ícono de <strong>compartir</strong> (el cuadrado con la flecha hacia
                arriba), en la barra de abajo.
              </li>
              <li>
                Baja en el menú que se abre y toca <strong>«Agregar a inicio»</strong>.
              </li>
              <li>
                Toca <strong>«Agregar»</strong> arriba a la derecha.
              </li>
            </ol>
            <p className="texto-suave">
              Ya te queda el ícono de AEMIPN en la pantalla de inicio, como cualquier otra app.
            </p>
          </>
        ) : (
          <>
            <div className="aviso aviso-info">
              En Android, Chrome normalmente ofrece instalarla solo; si no te salió el aviso,
              hazlo desde su menú.
            </div>

            <ol className="pasos-instalar">
              <li>
                Abre este sitio en <strong>Chrome</strong> (si estás leyendo esto ya estás en él).
              </li>
              <li>
                Toca el menú de <strong>tres puntos</strong>, arriba a la derecha.
              </li>
              <li>
                Toca <strong>«Instalar app»</strong> (o «Agregar a pantalla de inicio»).
              </li>
              <li>
                Confirma tocando <strong>«Instalar»</strong>.
              </li>
            </ol>
          </>
        )}

        <h2 style={{ marginTop: '2rem' }}>¿Y si ya la tengo instalada?</h2>
        <p>
          Se actualiza sola: cada vez que la abres revisa si hay una versión nueva y la toma sin
          pedirte nada. Si la dejaste abierta de fondo, ciérrala y vuelve a entrar para ver lo
          más reciente.
        </p>

        <h2>Necesitas haber iniciado sesión una vez</h2>
        <p>
          La app abre directo en el calendario del panel. Si nunca has entrado desde ese celular,
          la primera vez te pedirá tu correo y contraseña como de costumbre.
        </p>
      </div>
    </>
  );
}
