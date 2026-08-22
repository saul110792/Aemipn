import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area } from '../lib/types';
import { ErrorAviso } from '../components/Estado';
import { Icono, hayIcono } from '../components/Icono';

interface Formulario {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  telefono: string;
  escuela: string;
  boleta: string;
  areasInteres: string[];
  experiencia: string;
  mensaje: string;
}

export function Unete() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const { data: areas } = useQuery({
    queryKey: ['public', 'areas'],
    queryFn: () => api.get<Area[]>('/public/areas'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ defaultValues: { areasInteres: [] } });

  const onSubmit = handleSubmit(async (valores) => {
    setError(null);
    try {
      await api.post('/public/solicitudes', {
        ...valores,
        // Los campos vacios se envian como null en lugar de cadena vacia.
        apellidoMaterno: valores.apellidoMaterno || null,
        telefono: valores.telefono || null,
        escuela: valores.escuela || null,
        boleta: valores.boleta || null,
        experiencia: valores.experiencia || null,
        mensaje: valores.mensaje || null,
        areasInteres: Array.isArray(valores.areasInteres)
          ? valores.areasInteres
          : [valores.areasInteres].filter(Boolean),
      });
      setEnviado(true);
    } catch (e) {
      setError(e);
    }
  });

  if (enviado) {
    return (
      <div className="contenedor seccion" style={{ maxWidth: '640px' }}>
        <div className="aviso aviso-ok">
          <h2 style={{ marginTop: 0 }}>Solicitud recibida</h2>
          <p style={{ marginBottom: 0 }}>
            Gracias por tu interés en la AEMIPN. La mesa directiva revisará tu solicitud y te
            contactará por correo con los siguientes pasos y la fecha del próximo CIM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor seccion" style={{ maxWidth: '720px' }}>
      <h1>Únete a la AEMIPN</h1>
      <p className="texto-suave">
        Llena este formulario y nos pondremos en contacto contigo. No necesitas experiencia previa:
        el camino habitual es entrar por el CIM.
      </p>

      {error != null && <ErrorAviso error={error} />}

      <form onSubmit={onSubmit} style={{ marginTop: '1.5rem' }} noValidate>
        <div className="campos-2">
          <div className="campo">
            <label htmlFor="nombre">Nombre(s) *</label>
            <input id="nombre" {...register('nombre', { required: 'Escribe tu nombre' })} />
            {errors.nombre && <span className="error">{errors.nombre.message}</span>}
          </div>

          <div className="campo">
            <label htmlFor="apellidoPaterno">Apellido paterno *</label>
            <input id="apellidoPaterno" {...register('apellidoPaterno', { required: 'Escribe tu apellido paterno' })} />
            {errors.apellidoPaterno && <span className="error">{errors.apellidoPaterno.message}</span>}
          </div>
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="apellidoMaterno">Apellido materno</label>
            <input id="apellidoMaterno" {...register('apellidoMaterno')} />
          </div>

          <div className="campo">
            <label htmlFor="email">Correo electrónico *</label>
            <input
              id="email"
              type="email"
              {...register('email', {
                required: 'Escribe tu correo',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo no válido' },
              })}
            />
            {errors.email && <span className="error">{errors.email.message}</span>}
          </div>
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="telefono">Teléfono / WhatsApp</label>
            <input id="telefono" type="tel" {...register('telefono')} />
          </div>

          <div className="campo">
            <label htmlFor="escuela">Escuela o unidad</label>
            <input id="escuela" placeholder="ESIA, ESCOM, ENCB, externo…" {...register('escuela')} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="boleta">Boleta (si eres del IPN)</label>
          <input id="boleta" {...register('boleta')} />
        </div>

        <div className="campo">
          <label>Áreas que te interesan</label>
          <div className="casillas">
            {areas?.map((a) => (
              <label key={a.id} className="casilla">
                <input type="checkbox" value={a.slug} {...register('areasInteres')} />
                {hayIcono(a.slug) && (
                  <span style={{ color: a.color ?? 'var(--guinda)' }}>
                    <Icono nombre={a.slug} />
                  </span>
                )}
                {a.nombre}
              </label>
            ))}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="experiencia">¿Tienes experiencia previa en montaña?</label>
          <textarea id="experiencia" placeholder="Ninguna está bien: el CIM parte de cero." {...register('experiencia')} />
        </div>

        <div className="campo">
          <label htmlFor="mensaje">¿Algo más que quieras contarnos?</label>
          <textarea id="mensaje" {...register('mensaje')} />
        </div>

        <button type="submit" className="btn btn-verde" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>
    </div>
  );
}
