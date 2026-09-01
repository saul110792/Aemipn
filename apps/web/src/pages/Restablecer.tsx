import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorAviso } from '../components/Estado';

/**
 * Fija una nueva contraseña.
 * Con ?token=… en la liga alcanza con la contraseña nueva; sin ella, hace
 * falta también el correo y el código de seis caracteres.
 */
export function Restablecer() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const noCoinciden = confirmar.length > 0 && nueva !== confirmar;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (nueva !== confirmar) {
      setError(new Error('Las contraseñas no coinciden'));
      return;
    }
    setEnviando(true);
    try {
      await api.post('/auth/restablecer-password', {
        ...(token ? { token } : { codigo: codigo.trim().toUpperCase(), email }),
        nueva,
      });
      setOk(true);
    } catch (err) {
      setError(err);
    } finally {
      setEnviando(false);
    }
  };

  if (ok) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: '420px' }}>
        <div className="aviso aviso-ok">
          <h2 style={{ marginTop: 0 }}>Contraseña actualizada</h2>
          <p style={{ marginBottom: 0 }}>Ya puedes entrar con tu nueva contraseña.</p>
        </div>
        <Link to="/login" className="btn btn-verde" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: '420px' }}>
      <h1>Elige una nueva contraseña</h1>
      {!token && (
        <p className="texto-suave">
          Escribe el correo y el código de seis caracteres que te enviamos.
        </p>
      )}

      {error != null && <ErrorAviso error={error} />}

      <form onSubmit={enviar} style={{ marginTop: '1.25rem' }} noValidate>
        {!token && (
          <>
            <div className="campo">
              <label htmlFor="r-email">Tu correo</label>
              <input
                id="r-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="r-codigo">Código</label>
              <input
                id="r-codigo"
                value={codigo}
                maxLength={6}
                placeholder="ABC123"
                autoComplete="one-time-code"
                required
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '1.4rem', letterSpacing: '0.4em', textAlign: 'center',
                }}
              />
            </div>
          </>
        )}

        <div className="campo">
          <label htmlFor="r-nueva">Nueva contraseña</label>
          <input
            id="r-nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="r-confirmar">Confirma la contraseña</label>
          <input
            id="r-confirmar"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
          {noCoinciden && <span className="error">Las contraseñas no coinciden</span>}
        </div>

        <button
          type="submit"
          className="btn"
          disabled={enviando || (!token && codigo.length < 6) || !nueva || noCoinciden}
          style={{ width: '100%' }}
        >
          {enviando ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>
      </form>

      <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '1rem', textAlign: 'center' }}>
        ¿No te llegó o ya venció? <Link to="/olvide-password">Pide otra liga</Link>
      </p>
    </div>
  );
}
