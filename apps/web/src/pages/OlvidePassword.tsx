import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorAviso } from '../components/Estado';

/** Pide el correo y manda la liga para restablecer la contraseña. */
export function OlvidePassword() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await api.post('/auth/olvide-password', { email });
      setEnviado(true);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: '420px' }}>
        <div className="aviso aviso-ok">
          <h2 style={{ marginTop: 0 }}>Revisa tu correo</h2>
          <p style={{ marginBottom: 0 }}>
            Si esa cuenta existe, te enviamos una liga y un código para elegir una nueva
            contraseña. Sirven durante dos horas.
          </p>
        </div>
        <Link to="/login" className="btn btn-borde" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: '420px' }}>
      <h1>¿Olvidaste tu contraseña?</h1>
      <p className="texto-suave">Escribe el correo con el que te registraste.</p>

      {error != null && <ErrorAviso error={error} />}

      <form onSubmit={enviar} style={{ marginTop: '1.25rem' }} noValidate>
        <div className="campo">
          <label htmlFor="op-email">Correo</label>
          <input
            id="op-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button type="submit" className="btn" disabled={enviando} style={{ width: '100%' }}>
          {enviando ? 'Enviando…' : 'Enviar liga de recuperación'}
        </button>
      </form>

      <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </div>
  );
}
