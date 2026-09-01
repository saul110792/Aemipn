import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../lib/auth';
import { ErrorAviso } from '../components/Estado';

export function Login() {
  const { user, login, cargando } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string; password: string }>();

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      navigate('/panel');
    } catch (e) {
      setError(e);
    }
  });

  if (cargando) return <div className="vacio">Cargando…</div>;
  if (user) return <Navigate to="/panel" replace />;

  return (
    <div className="contenedor seccion" style={{ maxWidth: '420px' }}>
      <h1>Acceso al panel</h1>
      <p className="texto-suave">Para miembros de la mesa directiva y jefes de área.</p>

      {error != null && <ErrorAviso error={error} />}

      <form onSubmit={onSubmit} style={{ marginTop: '1.25rem' }} noValidate>
        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            {...register('email', { required: 'Escribe tu correo' })}
          />
          {errors.email && <span className="error">{errors.email.message}</span>}
        </div>

        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password', { required: 'Escribe tu contraseña' })}
          />
          {errors.password && <span className="error">{errors.password.message}</span>}
        </div>

        <button type="submit" className="btn" disabled={isSubmitting} style={{ width: '100%' }}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '1rem', textAlign: 'center' }}>
        <Link to="/olvide-password">¿Olvidaste tu contraseña?</Link>
      </p>
    </div>
  );
}
