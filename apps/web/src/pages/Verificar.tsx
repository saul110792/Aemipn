import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorAviso } from '../components/Estado';

type Estado = 'inicial' | 'verificando' | 'ok' | 'error';

/**
 * Confirmación de cuenta.
 * Si la dirección trae ?token=… se confirma sola; si no, se pide el código
 * de seis caracteres junto con el correo.
 */
export function Verificar() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'inicial');
  const [error, setError] = useState<unknown>(null);
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [codigo, setCodigo] = useState('');
  const [reenviado, setReenviado] = useState(false);

  // Con liga en la dirección, se confirma al abrir la página.
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    (async () => {
      try {
        await api.post('/registro/verificar', { token });
        if (vivo) setEstado('ok');
      } catch (e) {
        if (!vivo) return;
        setError(e);
        setEstado('error');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [token]);

  const porCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEstado('verificando');
    try {
      await api.post('/registro/verificar', { codigo: codigo.trim().toUpperCase(), email });
      setEstado('ok');
    } catch (err) {
      setError(err);
      setEstado('inicial');
    }
  };

  const reenviar = async () => {
    setError(null);
    try {
      await api.post('/registro/reenviar', { email });
      setReenviado(true);
    } catch (err) {
      setError(err);
    }
  };

  if (estado === 'ok') {
    return (
      <div className="contenedor seccion" style={{ maxWidth: '560px' }}>
        <div className="aviso aviso-ok">
          <h2 style={{ marginTop: 0 }}>Cuenta confirmada</h2>
          <p>Ya puedes entrar y completar tu expediente: datos de emergencia y cursos tomados.</p>
          <Link to="/login" className="btn btn-verde">Iniciar sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: '560px' }}>
      <h1>Confirma tu cuenta</h1>

      {estado === 'verificando' && token && <p className="texto-suave">Confirmando…</p>}
      {error != null && <ErrorAviso error={error} />}
      {reenviado && (
        <div className="aviso aviso-ok">
          Si esa cuenta estaba pendiente, te enviamos otra liga.
        </div>
      )}

      <p className="texto-suave">
        Escribe el código de seis caracteres que llegó a tu correo.
      </p>

      <form onSubmit={porCodigo} noValidate>
        <div className="campo">
          <label htmlFor="v-email">Tu correo</label>
          <input id="v-email" type="email" value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="campo">
          <label htmlFor="v-codigo">Código</label>
          <input
            id="v-codigo"
            value={codigo}
            maxLength={6}
            placeholder="ABC123"
            autoComplete="one-time-code"
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '1.4rem', letterSpacing: '0.4em', textAlign: 'center',
            }}
          />
        </div>

        <button type="submit" className="btn btn-verde"
          disabled={estado === 'verificando' || codigo.length < 6 || !email}>
          {estado === 'verificando' ? 'Confirmando…' : 'Confirmar cuenta'}
        </button>
      </form>

      <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '1.5rem' }}>
        ¿No te llegó o ya venció?{' '}
        <button
          type="button"
          onClick={reenviar}
          disabled={!email}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--guinda-600)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
        >
          Enviar otra liga
        </button>
      </p>
    </div>
  );
}
