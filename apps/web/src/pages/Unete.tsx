import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api } from '../lib/api';
import { ErrorAviso } from '../components/Estado';
import { Icono } from '../components/Icono';

interface Formulario {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  boleta: string;
  escuela: string;
  password: string;
  password2: string;
}

/**
 * Registro de quien ya forma parte de la AEMIPN.
 * Aquí solo se piden los datos básicos y una contraseña: el expediente
 * completo (NSS, contacto de emergencia, cursos) se llena después de
 * confirmar el correo, ya dentro del panel.
 */
export function Unete() {
  const [enviado, setEnviado] = useState<{ email: string } | null>(null);
  const [error, setError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>();

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      await api.post('/registro', {
        nombre: v.nombre,
        apellidoPaterno: v.apellidoPaterno,
        apellidoMaterno: v.apellidoMaterno || null,
        email: v.email,
        telefono: v.telefono || null,
        boleta: v.boleta || null,
        escuela: v.escuela || null,
        password: v.password,
      });
      setEnviado({ email: v.email });
    } catch (e) {
      setError(e);
    }
  });

  if (enviado) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: '640px' }}>
        <div className="aviso aviso-ok">
          <h2 style={{ marginTop: 0 }}>Revisa tu correo</h2>
          <p>
            Enviamos una liga de confirmación a <strong>{enviado.email}</strong>. Ábrela para
            activar tu cuenta; también incluye un código de seis caracteres por si prefieres
            escribirlo.
          </p>
          <p style={{ marginBottom: 0 }}>
            La liga sirve durante 24 horas.{' '}
            <Link to={`/verificar?email=${encodeURIComponent(enviado.email)}`}>
              Tengo el código
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="hero" style={{ padding: '3rem 0 2.5rem' }}>
        <div className="contenedor">
          <h1>Crea tu cuenta</h1>
          <p>
            Para quienes ya forman parte de la AEMIPN. Con tu cuenta registras los cursos que
            has tomado, tus datos de emergencia y ves lo de tus áreas.
          </p>
        </div>
      </header>

      <div className="contenedor seccion" style={{ maxWidth: '720px' }}>
        <div className="aviso aviso-info">
          <strong>¿Todavía no eres de la asociación?</strong> El camino de entrada es el{' '}
          <Link to="/cim">Curso Introductorio al Montañismo</Link>. Ahí te decimos cuándo abre la
          siguiente generación.
        </div>

        {error != null && <ErrorAviso error={error} />}

        <form onSubmit={onSubmit} noValidate style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Datos básicos</h2>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="r-nombre">Nombre(s) *</label>
              <input id="r-nombre" autoComplete="given-name" {...register('nombre', { required: 'Escribe tu nombre' })} />
              {errors.nombre && <span className="error">{errors.nombre.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="r-ap">Apellido paterno *</label>
              <input id="r-ap" {...register('apellidoPaterno', { required: 'Escribe tu apellido paterno' })} />
              {errors.apellidoPaterno && <span className="error">{errors.apellidoPaterno.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="r-am">Apellido materno</label>
              <input id="r-am" {...register('apellidoMaterno')} />
            </div>
            <div className="campo">
              <label htmlFor="r-tel">Teléfono / WhatsApp</label>
              <input id="r-tel" type="tel" autoComplete="tel" {...register('telefono')} />
            </div>
            <div className="campo">
              <label htmlFor="r-boleta">Boleta (si eres del IPN)</label>
              <input id="r-boleta" {...register('boleta')} />
            </div>
            <div className="campo">
              <label htmlFor="r-escuela">Escuela o unidad</label>
              <input id="r-escuela" placeholder="ESIA, ESCOM, ENCB, externo…" {...register('escuela')} />
            </div>
          </div>

          <h2 style={{ fontSize: '1.15rem', marginTop: '1.5rem' }}>Acceso</h2>

          <div className="campo">
            <label htmlFor="r-email">Correo electrónico *</label>
            <input
              id="r-email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Escribe tu correo',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo no válido' },
              })}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
            <span className="texto-suave" style={{ fontSize: '0.83rem' }}>
              Ahí te llega la liga de confirmación.
            </span>
          </div>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="r-pass">Contraseña *</label>
              <input
                id="r-pass"
                type="password"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Elige una contraseña',
                  minLength: { value: 8, message: 'Al menos 8 caracteres' },
                })}
              />
              {errors.password && <span className="error">{errors.password.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="r-pass2">Repite la contraseña *</label>
              <input
                id="r-pass2"
                type="password"
                autoComplete="new-password"
                {...register('password2', {
                  required: 'Repite la contraseña',
                  validate: (v) => v === watch('password') || 'Las contraseñas no coinciden',
                })}
              />
              {errors.password2 && <span className="error">{errors.password2.message}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn-verde" disabled={isSubmitting}>
            <Icono nombre="miembros" />
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>

          <p className="texto-suave" style={{ fontSize: '0.87rem', marginTop: '1rem' }}>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>.
          </p>
        </form>
      </div>
    </>
  );
}
