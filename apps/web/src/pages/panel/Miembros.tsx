import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import type { Area, Member, MemberStatus, Paginated } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { etiqueta, fmtFechaCorta, nombreCompleto } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import { TIPOS_DE_SANGRE } from '../../lib/catalogos';

const ESTADOS: MemberStatus[] = ['ASPIRANTE', 'ACTIVO', 'INACTIVO', 'BAJA'];

export function Miembros() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [areaId, setAreaId] = useState('');
  const [page, setPage] = useState(1);
  const [creando, setCreando] = useState(false);

  const params = new URLSearchParams({ page: String(page), perPage: '25' });
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (areaId) params.set('areaId', areaId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', params.toString()],
    queryFn: () => api.get<Paginated<Member>>(`/members?${params}`),
  });

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: () => api.get<Area[]>('/areas'),
  });

  const crear = useMutation({
    mutationFn: (valores: Record<string, unknown>) => api.post<Member>('/members', valores),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      setCreando(false);
    },
  });

  return (
    <>
      <div className="panel-encabezado">
        <h1>Miembros</h1>
        {esAdmin && (
          <button type="button" className="btn" onClick={() => setCreando((v) => !v)}>
            {creando ? 'Cancelar' : 'Agregar miembro'}
          </button>
        )}
      </div>

      {creando && (
        <FormularioMiembro
          areas={areas ?? []}
          onGuardar={(v) => crear.mutate(v)}
          guardando={crear.isPending}
          error={crear.error}
        />
      )}

      <div className="barra-filtros">
        <input
          type="search"
          placeholder="Buscar por nombre, correo o boleta…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>{etiqueta(s)}</option>
          ))}
        </select>
        <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setPage(1); }}>
          <option value="">Todas las áreas</option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        {data && <span className="texto-suave">{data.meta.total} resultado(s)</span>}
      </div>

      {isLoading && <Cargando />}
      {error && <ErrorAviso error={error} />}

      {data && data.data.length === 0 && (
        <div className="vacio">No hay miembros que coincidan con el filtro.</div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Áreas</th>
                  <th>Cursos</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/panel/miembros/${m.id}`}>
                        <strong>{nombreCompleto(m)}</strong>
                      </Link>
                      {m.boleta && <div className="texto-suave" style={{ fontSize: '0.82rem' }}>Boleta {m.boleta}</div>}
                    </td>
                    <td className="texto-suave" style={{ fontSize: '0.88rem' }}>
                      {m.email}
                      {m.telefono && <div>{m.telefono}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {m.areas?.length
                          ? m.areas.map((am) => {
                              // El cargo se pinta encima de la pertenencia: son
                              // dos hechos distintos sobre la misma persona.
                              const cargo = m.jefaturas?.find((j) => j.areaId === am.area.id);
                              return (
                                <span
                                  key={am.id}
                                  className="insignia"
                                  title={cargo ? etiqueta(cargo.cargo) : 'Miembro del área'}
                                  style={
                                    cargo
                                      ? { background: am.area.color ?? undefined, color: '#fff' }
                                      : undefined
                                  }
                                >
                                  {am.area.nombre}
                                  {cargo && ` · ${etiqueta(cargo.cargo)}`}
                                </span>
                              );
                            })
                          : <span className="texto-suave">—</span>}
                      </div>
                    </td>
                    <td>{m._count?.enrollments ?? 0}</td>
                    <td className="texto-suave">{fmtFechaCorta(m.fechaIngreso)}</td>
                    <td><Insignia valor={m.status} texto={etiqueta(m.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.meta.totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '1rem' }}>
              <button type="button" className="btn btn-borde btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span className="texto-suave">Página {data.meta.page} de {data.meta.totalPages}</span>
              <button
                type="button"
                className="btn btn-borde btn-sm"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function FormularioMiembro({
  areas,
  onGuardar,
  guardando,
  error,
}: {
  areas: Area[];
  onGuardar: (valores: Record<string, unknown>) => void;
  guardando: boolean;
  error: unknown;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>();

  return (
    <div className="tarjeta" style={{ marginBottom: '1.5rem' }}>
      <div className="tarjeta-cuerpo">
        <h3>Nuevo miembro</h3>
        {error != null && <ErrorAviso error={error} />}

        <form
          onSubmit={handleSubmit((v) =>
            onGuardar(Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === '' ? null : val]))),
          )}
          noValidate
        >
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="n-nombre">Nombre(s) *</label>
              <input id="n-nombre" {...register('nombre', { required: 'Obligatorio' })} />
              {errors.nombre && <span className="error">{errors.nombre.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="n-ap">Apellido paterno *</label>
              <input id="n-ap" {...register('apellidoPaterno', { required: 'Obligatorio' })} />
              {errors.apellidoPaterno && <span className="error">{errors.apellidoPaterno.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="n-am">Apellido materno</label>
              <input id="n-am" {...register('apellidoMaterno')} />
            </div>
            <div className="campo">
              <label htmlFor="n-email">Correo *</label>
              <input id="n-email" type="email" {...register('email', { required: 'Obligatorio' })} />
              {errors.email && <span className="error">{errors.email.message}</span>}
            </div>
            <div className="campo">
              <label htmlFor="n-tel">Teléfono</label>
              <input id="n-tel" type="tel" {...register('telefono')} />
            </div>
            <div className="campo">
              <label htmlFor="n-boleta">Boleta</label>
              <input id="n-boleta" {...register('boleta')} />
            </div>
            <div className="campo">
              <label htmlFor="n-escuela">Escuela</label>
              <input id="n-escuela" {...register('escuela')} />
            </div>
            <div className="campo">
              <label htmlFor="n-status">Estado</label>
              <select id="n-status" defaultValue="ASPIRANTE" {...register('status')}>
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>{etiqueta(s)}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="n-sangre">Tipo de sangre</label>
              <select id="n-sangre" {...register('tipoSangre')}>
                <option value="">No lo sé</option>
                {TIPOS_DE_SANGRE.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="n-emerg">Contacto de emergencia</label>
              <input id="n-emerg" {...register('contactoEmergencia')} />
            </div>
            <div className="campo">
              <label htmlFor="n-telemerg">Teléfono de emergencia</label>
              <input id="n-telemerg" type="tel" {...register('telefonoEmergencia')} />
            </div>
          </div>

          <p className="texto-suave" style={{ fontSize: '0.87rem' }}>
            Las áreas se asignan desde la ficha del miembro una vez creado
            {areas.length ? ` (${areas.length} disponibles)` : ''}.
          </p>

          <button type="submit" className="btn btn-verde" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar miembro'}
          </button>
        </form>
      </div>
    </div>
  );
}
