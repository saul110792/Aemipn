import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Area, Course, CourseKind } from '../../lib/types';
import { Cargando, ErrorAviso, Insignia } from '../../components/Estado';
import { Icono, hayIcono } from '../../components/Icono';
import { etiquetaTipoCurso } from '../../lib/format';
import { sugerirCodigo, sugerirSlug } from '../../lib/codigos';
import { useAuth } from '../../lib/auth';

interface CursoConteo extends Course {
  _count: { ediciones: number };
  contenido?: string | null;
  areaId?: string | null;
  activo?: boolean;
}

const TIPOS: CourseKind[] = ['AREA', 'TALLER', 'CIM', 'CERTIFICACION'];

const VACIO = {
  nombre: '', codigo: '', slug: '', kind: 'TALLER' as CourseKind,
  areaId: '', duracionHoras: '', descripcion: '', requisitos: '', activo: true,
};

export function CursosPanel() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState<CursoConteo | null>(null);
  const [creando, setCreando] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.get<CursoConteo[]>('/courses'),
  });

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => api.get<Area[]>('/areas') });

  const cerrar = () => {
    setCreando(false);
    setEditando(null);
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  if (isLoading) return <Cargando />;
  if (error) return <ErrorAviso error={error} />;

  return (
    <>
      <div className="panel-encabezado">
        <div>
          <h1>Catálogo de cursos</h1>
          <p className="texto-suave" style={{ margin: 0 }}>
            La definición de cada curso. Sus fechas concretas viven en las ediciones.
          </p>
        </div>
        {esAdmin && (
          <button type="button" className="btn" onClick={() => { setEditando(null); setCreando((v) => !v); }}>
            {creando ? 'Cancelar' : 'Nuevo curso'}
          </button>
        )}
      </div>

      {(creando || editando) && (
        <FormularioCurso
          areas={areas ?? []}
          curso={editando}
          cursos={data ?? []}
          onListo={cerrar}
          onCancelar={cerrar}
        />
      )}

      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Curso</th>
              <th>Área</th>
              <th>Tipo</th>
              <th>Horas</th>
              <th>Ediciones</th>
              {esAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id} style={c.activo === false ? { opacity: 0.55 } : undefined}>
                <td>
                  {c.codigo ? (
                    <code style={{ fontWeight: 700, color: 'var(--guinda)' }}>{c.codigo}</code>
                  ) : (
                    <span className="insignia insignia-ambar">sin código</span>
                  )}
                </td>
                <td>
                  <strong>{c.nombre}</strong>
                  {c.activo === false && <> <span className="insignia">inactivo</span></>}
                </td>
                <td>
                  {c.area ? (
                    <span className="insignia" style={{ background: `${c.area.color}1f`, color: c.area.color ?? undefined }}>
                      {hayIcono(c.area.slug) && <Icono nombre={c.area.slug} />}
                      {c.area.nombre}
                    </span>
                  ) : (
                    <span className="texto-suave">Transversal</span>
                  )}
                </td>
                <td><Insignia valor={c.kind} texto={etiquetaTipoCurso(c.kind)} /></td>
                <td>{c.duracionHoras ?? '—'}</td>
                <td>{c._count.ediciones}</td>
                {esAdmin && (
                  <td>
                    <button
                      type="button"
                      className="btn btn-borde btn-sm"
                      onClick={() => { setCreando(false); setEditando(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FormularioCurso({
  areas, curso, cursos, onListo, onCancelar,
}: {
  areas: Area[];
  curso: CursoConteo | null;
  cursos: CursoConteo[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [f, setF] = useState(VACIO);
  const [codigoTocado, setCodigoTocado] = useState(false);
  const [slugTocado, setSlugTocado] = useState(false);

  useEffect(() => {
    if (curso) {
      setF({
        nombre: curso.nombre,
        codigo: curso.codigo ?? '',
        slug: curso.slug,
        kind: curso.kind,
        areaId: curso.areaId ?? '',
        duracionHoras: curso.duracionHoras ? String(curso.duracionHoras) : '',
        descripcion: curso.descripcion ?? '',
        requisitos: curso.requisitos ?? '',
        activo: curso.activo !== false,
      });
      setCodigoTocado(true);
      setSlugTocado(true);
    } else {
      setF(VACIO);
      setCodigoTocado(false);
      setSlugTocado(false);
    }
  }, [curso?.id]);

  // Mientras nadie los escriba a mano, código y slug siguen al nombre.
  const alCambiarNombre = (nombre: string) =>
    setF((v) => ({
      ...v,
      nombre,
      codigo: codigoTocado ? v.codigo : sugerirCodigo(nombre),
      slug: slugTocado ? v.slug : sugerirSlug(nombre),
    }));

  const cuerpo = () => ({
    nombre: f.nombre.trim(),
    codigo: f.codigo.trim().toUpperCase() || null,
    slug: f.slug.trim(),
    kind: f.kind,
    areaId: f.areaId || null,
    duracionHoras: f.duracionHoras ? Number(f.duracionHoras) : null,
    descripcion: f.descripcion.trim() || null,
    requisitos: f.requisitos.trim() || null,
    activo: f.activo,
  });

  const guardar = useMutation({
    mutationFn: () =>
      curso ? api.patch(`/courses/${curso.id}`, cuerpo()) : api.post('/courses', cuerpo()),
    onSuccess: onListo,
  });

  // El código encabeza las claves de edición, así que no puede repetirse.
  const codigoRepetido =
    f.codigo.trim() !== '' &&
    cursos.some((c) => c.id !== curso?.id && c.codigo?.toUpperCase() === f.codigo.trim().toUpperCase());

  const faltantes = [
    !f.nombre.trim() && 'el nombre',
    !f.slug.trim() && 'el identificador',
  ].filter((x): x is string => Boolean(x));
  const listo = faltantes.length === 0 && !codigoRepetido;

  return (
    <div className="tarjeta" style={{ marginBottom: '1.5rem' }}>
      <div className="tarjeta-cuerpo">
        <h3>{curso ? `Editar ${curso.nombre}` : 'Nuevo curso'}</h3>
        {guardar.error != null && <ErrorAviso error={guardar.error} />}

        <div className="campo">
          <label htmlFor="c-nombre">Nombre del curso *</label>
          <input
            id="c-nombre"
            value={f.nombre}
            placeholder="Curso Básico de Escalada en Roca"
            onChange={(e) => alCambiarNombre(e.target.value)}
          />
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="c-codigo">
              Código
              <span className="texto-suave" style={{ fontWeight: 400 }}> — encabeza la clave de sus ediciones</span>
            </label>
            <input
              id="c-codigo"
              value={f.codigo}
              placeholder="CBER"
              maxLength={8}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              onChange={(e) => { setF({ ...f, codigo: e.target.value.toUpperCase() }); setCodigoTocado(true); }}
            />
            {codigoRepetido ? (
              <span className="error">Ese código ya lo usa otro curso.</span>
            ) : (
              <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
                {f.codigo ? `Sus ediciones se llamarán ${f.codigo}_${new Date().getFullYear()}A, ${f.codigo}_${new Date().getFullYear()}B…` : 'Si lo dejas vacío se genera del nombre.'}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="c-area">Área</label>
            <select id="c-area" value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value })}>
              <option value="">Transversal (toda la asociación)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo ? `${a.codigo} · ` : ''}{a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="c-kind">Tipo</label>
            <select id="c-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as CourseKind })}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{etiquetaTipoCurso(t)}</option>
              ))}
            </select>
            <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
              {f.kind === 'AREA'
                ? 'Es el curso base del área: acreditarlo integra a ella.'
                : f.kind === 'TALLER'
                  ? 'Formación complementaria dentro del área.'
                  : f.kind === 'CIM'
                    ? 'Curso introductorio, transversal a toda la asociación.'
                    : ''}
            </span>
          </div>

          <div className="campo">
            <label htmlFor="c-horas">Duración (horas)</label>
            <input id="c-horas" type="number" min="1" value={f.duracionHoras}
              onChange={(e) => setF({ ...f, duracionHoras: e.target.value })} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="c-desc">Descripción</label>
          <textarea id="c-desc" style={{ minHeight: 70 }} value={f.descripcion}
            onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </div>

        <div className="campo">
          <label htmlFor="c-req">Requisitos</label>
          <textarea id="c-req" style={{ minHeight: 60 }} value={f.requisitos}
            onChange={(e) => setF({ ...f, requisitos: e.target.value })} />
        </div>

        <div className="campo">
          <label htmlFor="c-slug">
            Identificador para la dirección web *
            <span className="texto-suave" style={{ fontWeight: 400 }}> — se genera solo</span>
          </label>
          <input
            id="c-slug"
            value={f.slug}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
            onChange={(e) => { setF({ ...f, slug: sugerirSlug(e.target.value) }); setSlugTocado(true); }}
          />
        </div>

        <label className="casilla" style={{ marginBottom: '1rem' }}>
          <input type="checkbox" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
          Activo (visible en el sitio público)
        </label>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-verde" disabled={!listo || guardar.isPending}
            onClick={() => guardar.mutate()}>
            {guardar.isPending ? 'Guardando…' : curso ? 'Guardar cambios' : 'Crear curso'}
          </button>
          <button type="button" className="btn btn-borde" onClick={onCancelar}>Cancelar</button>
          {faltantes.length > 0 && (
            <span className="texto-suave" style={{ alignSelf: 'center', fontSize: '0.85rem' }}>
              {faltantes.length === 1 ? 'Falta ' : 'Faltan '}
              {faltantes.join(' y ')}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
