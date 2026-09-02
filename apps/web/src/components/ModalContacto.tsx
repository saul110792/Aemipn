import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area } from '../lib/types';
import { ErrorAviso } from './Estado';
import { CampoTelefono } from './CampoTelefono';

interface Formulario {
  nombre: string;
  email: string;
  telefono: string;
  areaId: string;
  mensaje: string;
}

/**
 * "Contáctanos" del pie del sitio.
 *
 * Quien escribe elige a quién: la mesa directiva en general, o el área con
 * la que quiere hablar — así el mensaje le llega directo a quien puede
 * atenderlo, en vez de pasar siempre por la mesa.
 */
export function ModalContacto({ onCerrar }: { onCerrar: () => void }) {
  const [enviado, setEnviado] = useState(false);

  const { data: areas } = useQuery({
    queryKey: ['public', 'areas'],
    queryFn: () => api.get<Area[]>('/public/areas'),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ defaultValues: { areaId: '' } });

  const enviar = useMutation({
    mutationFn: (v: Formulario) =>
      api.post('/public/contacto', {
        nombre: v.nombre,
        email: v.email,
        telefono: v.telefono || null,
        areaId: v.areaId || null,
        mensaje: v.mensaje,
      }),
    onSuccess: () => setEnviado(true),
  });

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
          ×
        </button>

        {enviado ? (
          <div className="aviso aviso-ok" style={{ marginTop: '1rem' }}>
            <strong>¡Gracias!</strong> Recibimos tu mensaje. Te responderán pronto al correo que
            dejaste.
          </div>
        ) : (
          <>
            <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Contáctanos</h2>
            <p className="texto-suave" style={{ fontSize: '0.9rem' }}>
              Elige a quién va dirigido tu mensaje: la mesa directiva, o el área con la que
              quieres hablar.
            </p>

            {enviar.error != null && <ErrorAviso error={enviar.error} />}

            <form onSubmit={handleSubmit((v) => enviar.mutate(v))} noValidate>
              <div className="campo">
                <label htmlFor="c-nombre">Nombre *</label>
                <input id="c-nombre" {...register('nombre', { required: 'Escribe tu nombre' })} />
                {errors.nombre && <span className="error">{errors.nombre.message}</span>}
              </div>

              <div className="campos-2">
                <div className="campo">
                  <label htmlFor="c-email">Correo *</label>
                  <input
                    id="c-email"
                    type="email"
                    {...register('email', {
                      required: 'Escribe tu correo',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Correo no válido' },
                    })}
                  />
                  {errors.email && <span className="error">{errors.email.message}</span>}
                </div>
                <div className="campo">
                  <label htmlFor="c-tel">Teléfono</label>
                  <CampoTelefono id="c-tel" value={watch('telefono') ?? ''} onChange={(v) => setValue('telefono', v)} />
                </div>
              </div>

              <div className="campo">
                <label htmlFor="c-area">Dirigido a</label>
                <select id="c-area" {...register('areaId')}>
                  <option value="">Mesa directiva (general)</option>
                  {areas?.map((a) => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="c-mensaje">Mensaje *</label>
                <textarea
                  id="c-mensaje"
                  style={{ minHeight: 100 }}
                  maxLength={2000}
                  {...register('mensaje', { required: 'Escribe tu mensaje' })}
                />
                {errors.mensaje && <span className="error">{errors.mensaje.message}</span>}
              </div>

              <button type="submit" className="btn btn-verde" disabled={isSubmitting}>
                {isSubmitting ? 'Enviando…' : 'Enviar mensaje'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
