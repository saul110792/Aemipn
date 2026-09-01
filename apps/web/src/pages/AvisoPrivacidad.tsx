import { Link } from 'react-router-dom';

/**
 * Aviso de privacidad.
 *
 * IMPORTANTE: este texto es un borrador inicial, no asesoría legal. Antes de
 * tratarlo como el aviso oficial de la asociación, debe revisarlo la mesa
 * directiva de la AEMIPN — y, si hace falta, el área jurídica del IPN.
 */
export function AvisoPrivacidad() {
  return (
    <>
      <header className="hero" style={{ padding: '3rem 0 2.5rem' }}>
        <div className="contenedor">
          <h1>Aviso de privacidad</h1>
          <p>Cómo tratamos tus datos personales, y en particular los datos médicos.</p>
        </div>
      </header>

      <div className="contenedor seccion" style={{ maxWidth: '760px' }}>
        <div className="aviso aviso-info">
          <strong>Nota de transparencia:</strong> este aviso es un borrador redactado como punto de
          partida, siguiendo los elementos mínimos que pide la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (LFPDPPP). No es asesoría legal certificada.
          La mesa directiva de la AEMIPN (y, de ser necesario, el área jurídica del IPN) debe
          revisarlo antes de tomarlo como el aviso oficial y vigente de la asociación.
        </div>

        <h2>Responsable</h2>
        <p>
          La <strong>Asociación de Excursionismo y Montañismo del Instituto Politécnico Nacional
          (AEMIPN)</strong>, a través de su mesa directiva, es responsable del tratamiento de tus
          datos personales conforme a este aviso.
        </p>

        <h2>Qué datos recabamos</h2>
        <p>Al registrarte y completar tu expediente, podemos recabar:</p>
        <ul>
          <li>
            <strong>Datos de identificación y contacto:</strong> nombre, correo, teléfono, boleta,
            escuela, dirección.
          </li>
          <li>
            <strong>Datos personales sensibles</strong> (Art. 3, fracción VI de la LFPDPPP — su mal
            uso podría dar origen a discriminación o implica un riesgo grave, por eso la ley les
            da trato especial): tipo de sangre, alergias, padecimientos, lesiones u operaciones
            relevantes, y tu servicio médico (institución y número de afiliación).
          </li>
          <li>
            <strong>Contactos de emergencia:</strong> nombre y teléfono de una o dos personas a
            quienes localizar si algo pasa durante una actividad.
          </li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>Exclusivamente para:</p>
        <ul>
          <li>Verificar tu pertenencia a la asociación y a sus áreas.</li>
          <li>
            Que quien organiza o va al frente de una salida tenga a la mano lo necesario para
            actuar rápido ante una emergencia médica.
          </li>
          <li>Contactar a alguien de tu confianza si ocurre un incidente.</li>
          <li>Lo administrativo propio de la asociación: cursos, cargos, historial.</li>
        </ul>
        <p>No usamos tus datos con fines de mercadotecnia ni los vendemos a nadie.</p>

        <h2>Quién los ve</h2>
        <p>
          Tu expediente completo lo ves tú y la mesa directiva. El jefe o tesorero de tu área ve el
          padrón de su propia área — nadie ve el expediente de un área a la que no pertenece. El
          responsable de una salida ve los datos de quienes van inscritos a esa salida en
          particular, para tenerlos a la mano en campo.
        </p>

        <h2>Transferencias</h2>
        <p>
          No compartimos tus datos personales con terceros ajenos a la asociación, salvo que la ley
          lo exija (por ejemplo, una autoridad competente investigando un incidente).
        </p>

        <h2>Tus derechos (ARCO)</h2>
        <p>
          Puedes Acceder, Rectificar o Cancelar tus datos, u Oponerte a su tratamiento, en cualquier
          momento. También puedes revocar tu consentimiento para el tratamiento de tus datos
          sensibles — aunque eso puede limitar tu participación en salidas, ya que esa información
          es justo la que permite actuar rápido en una emergencia.
        </p>
        <p>
          Para ejercer cualquiera de estos derechos, usa{' '}
          <Link to="/">el formulario de «Contáctanos»</Link> del sitio, dirigido a la mesa
          directiva, o corrige lo que puedas directamente desde tu «Mi expediente» dentro del
          panel.
        </p>

        <h2>Cambios a este aviso</h2>
        <p>
          Si este aviso cambia de forma importante, lo anunciaremos en el sitio y, de ser
          necesario, te pediremos aceptarlo de nuevo antes de seguir usando el panel.
        </p>

        <p className="texto-suave" style={{ fontSize: '0.85rem' }}>
          Última actualización: este borrador. Sustituir esta nota por la fecha real una vez que la
          mesa directiva lo revise y publique como versión oficial.
        </p>
      </div>
    </>
  );
}
