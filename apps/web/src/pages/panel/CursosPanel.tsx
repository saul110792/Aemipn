import { useEffect, useMemo, useState } from 'react';
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
  /// Lo decide el servidor, no la interfaz: es la misma regla que aplica el
  /// API al guardar, así que el botón nunca promete algo que luego se niega.
  puedeEditar?: boolean;
  /// Cursos que hay que traer acreditados para poder tomar este.
  requiere?: { id: string; nombre: string; codigo: string | null }[];
}

const TIPOS: CourseKind[] = ['AREA', 'TALLER', 'CIM', 'CERTIFICACION'];

/** Compara ignorando acentos y mayusculas, como espera quien busca "canonismo". */
const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const FILTROS_VACIOS = { texto: '', areaId: '', kind: '', estado: '' };

const VACIO = {
  nombre: '', codigo: '', slug: '', kind: 'TALLER' as CourseKind,
  areaId: '', duracionHoras: '', descripcion: '', requisitos: '', activo: true,
};

export function CursosPanel() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const [editando, setEditando] = useState<CursoConteo | null>(null);
  const [creando, setCreando] = useState(false);

  // Un jefe ve el catálogo de su área y nada más; la mesa directiva ve todo.
  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', esAdmin ? 'todos' : 'mis-areas'],
    queryFn: () =>
      api.get<CursoConteo[]>(`/courses${esAdmin ? '' : '?soloMisAreas=true'}`),
  });

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => api.get<Area[]>('/areas') });

  // Las áreas que encabeza se deducen de lo que el servidor dejó editable:
  // no hace falta preguntarle por separado quién es.
  const misAreas = useMemo(
    () => [...new Set((data ?? []).filter((c) => c.puedeEditar && c.areaId).map((c) => c.areaId!))],
    [data],
  );
  const puedeCrear = esAdmin || misAreas.length > 0;
  // Ofrecer las ocho áreas cuando solo se ven los cursos de una deja filtros
  // que no devuelven nada. Se listan las que de verdad aparecen en la tabla.
  const areasDelFiltro = useMemo(
    () => (esAdmin ? (areas ?? []) : (areas ?? []).filter((a) => misAreas.includes(a.id))),
    [areas, esAdmin, misAreas],
  );

  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const hayFiltro = Object.values(filtros).some(Boolean);

  // El catalogo son unas decenas de filas: filtrar aqui es instantaneo y
  // evita un viaje al servidor por cada tecla.
  const visibles = useMemo(() => {
    const t = normalizar(filtros.texto.trim());
    const slugArea = areas?.find((a) => a.id === filtros.areaId)?.slug;

    return (data ?? []).filter((c) => {
      if (filtros.areaId === '__sin__' && c.area) return false;
      if (filtros.areaId && filtros.areaId !== '__sin__' && c.area?.slug !== slugArea) return false;
      if (filtros.kind && c.kind !== filtros.kind) return false;
      if (filtros.estado === 'activos' && c.activo === false) return false;
      if (filtros.estado === 'inactivos' && c.activo !== false) return false;
      if (!t) return true;
      return (
        normalizar(c.nombre).includes(t) ||
        normalizar(c.codigo ?? '').includes(t) ||
        normalizar(c.area?.nombre ?? '').includes(t)
      );
    });
  }, [data, areas, filtros]);

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
          {!esAdmin && (
            <p className="texto-suave" style={{ margin: '.35rem 0 0', fontSize: '.85rem' }}>
              Solo aparecen los cursos de tu área. El curso base y el CIM los edita la mesa directiva.
            </p>
          )}
        </div>
        {puedeCrear && (
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
          esAdmin={esAdmin}
          misAreas={misAreas}
          onListo={cerrar}
          onCancelar={cerrar}
        />
      )}

      <div className="barra-filtros">
        <input
          type="search"
          aria-label="Buscar curso"
          placeholder="Buscar por nombre, código o área…"
          value={filtros.texto}
          onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })}
        />

        <select
          aria-label="Filtrar por área"
          value={filtros.areaId}
          onChange={(e) => setFiltros({ ...filtros, areaId: e.target.value })}
        >
          <option value="">Todas las áreas</option>
          {esAdmin && <option value="__sin__">Transversales (sin área)</option>}
          {areasDelFiltro.map((a) => (
            <option key={a.id} value={a.id}>
              {a.codigo ? a.codigo + ' · ' : ''}{a.nombre}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por tipo"
          value={filtros.kind}
          onChange={(e) => setFiltros({ ...filtros, kind: e.target.value })}
        >
          <option value="">Todos los tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{etiquetaTipoCurso(t)}</option>
          ))}
        </select>

        <select
          aria-label="Filtrar por estado"
          value={filtros.estado}
          onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
        >
          <option value="">Activos e inactivos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>

        <span className="texto-suave">
          {visibles.length === (data?.length ?? 0)
            ? visibles.length + ' curso(s)'
            : visibles.length + ' de ' + (data?.length ?? 0)}
        </span>

        {hayFiltro && (
          <button type="button" className="btn btn-borde btn-sm" onClick={() => setFiltros(FILTROS_VACIOS)}>
            Limpiar
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="vacio">
          Ningún curso coincide con el filtro.{' '}
          <button
            type="button"
            onClick={() => setFiltros(FILTROS_VACIOS)}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--guinda-600)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
          >
            Quitar los filtros
          </button>
        </div>
      ) : (
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
              {puedeCrear && <th />}
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
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
                  {(c.requiere?.length ?? 0) > 0 && (
                    <div className="texto-suave" style={{ fontSize: '.78rem', marginTop: '.15rem' }}>
                      Exige antes: {c.requiere!.map((r) => r.codigo ?? r.nombre).join(' + ')}
                    </div>
                  )}
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
                {puedeCrear && (
                  <td>
                    {c.puedeEditar !== false ? (
                      <button
                        type="button"
                        className="btn btn-borde btn-sm"
                        onClick={() => { setCreando(false); setEditando(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      >
                        Editar
                      </button>
                    ) : (
                      <span className="texto-suave" style={{ fontSize: '.8rem' }}>Solo lectura</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

function FormularioCurso({
  areas, curso, cursos, esAdmin, misAreas, onListo, onCancelar,
}: {
  areas: Area[];
  curso: CursoConteo | null;
  cursos: CursoConteo[];
  esAdmin: boolean;
  misAreas: string[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const areasElegibles = esAdmin ? areas : areas.filter((a) => misAreas.includes(a.id));
  // Dar de alta un curso base cambia quién obtiene membresía del área; eso lo
  // decide la mesa directiva. Un jefe arma sus talleres.
  const tiposElegibles = esAdmin ? TIPOS : (['TALLER', 'CERTIFICACION'] as CourseKind[]);
  // Al editar, el área y el tipo del curso quedan fijos para quien no es mesa:
  // moverlos sacaría el curso de su alcance o cambiaría la regla de membresía.
  const camposFijos = !esAdmin && curso !== null;

  const [f, setF] = useState({
    ...VACIO,
    ...(esAdmin ? {} : { areaId: areasElegibles[0]?.id ?? '', kind: 'TALLER' as CourseKind }),
  });
  const [codigoTocado, setCodigoTocado] = useState(false);
  const [slugTocado, setSlugTocado] = useState(false);
  const [requiereIds, setRequiereIds] = useState<string[]>([]);

  useEffect(() => {
    setRequiereIds(curso?.requiere?.map((r) => r.id) ?? []);
  }, [curso?.id]);

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
      setF({
        ...VACIO,
        ...(esAdmin ? {} : { areaId: areasElegibles[0]?.id ?? '', kind: 'TALLER' as CourseKind }),
      });
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

  // Los requisitos viven en su propia ruta (son una relacion, no un campo) y
  // solo los toca la mesa directiva, porque atan cursos de areas distintas.
  const requisitosCambiaron =
    esAdmin &&
    JSON.stringify([...requiereIds].sort()) !==
      JSON.stringify((curso?.requiere ?? []).map((r) => r.id).sort());

  const guardar = useMutation({
    mutationFn: async () => {
      const guardado = curso
        ? await api.patch<{ id: string }>(`/courses/${curso.id}`, cuerpo())
        : await api.post<{ id: string }>('/courses', cuerpo());
      if (esAdmin && (requisitosCambiaron || (!curso && requiereIds.length)))
        await api.put(`/courses/${guardado.id}/requisitos`, { requiereIds });
      return guardado;
    },
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
            <select
              id="c-area"
              value={f.areaId}
              disabled={camposFijos}
              onChange={(e) => setF({ ...f, areaId: e.target.value })}
            >
              {esAdmin && <option value="">Transversal (toda la asociación)</option>}
              {areasElegibles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo ? `${a.codigo} · ` : ''}{a.nombre}
                </option>
              ))}
            </select>
            {camposFijos && (
              <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
                Mover un curso de área corresponde a la mesa directiva.
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="c-kind">Tipo</label>
            <select
              id="c-kind"
              value={f.kind}
              disabled={camposFijos}
              onChange={(e) => setF({ ...f, kind: e.target.value as CourseKind })}
            >
              {tiposElegibles.map((t) => (
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
          <label htmlFor="c-req">
            Qué traer y qué se pide
            <span className="texto-suave" style={{ fontWeight: 400 }}>
              {' '}— equipo, edad, condición física. Texto libre para el sitio público.
            </span>
          </label>
          <textarea id="c-req" style={{ minHeight: 60 }} value={f.requisitos}
            placeholder="Ropa deportiva, calzado de suela firme, agua y lonche."
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

        {esAdmin && (
          <div className="campo">
            <label>
              Hay que acreditar antes
              <span className="texto-suave" style={{ fontWeight: 400 }}>
                {' '}— quien no los tenga no se puede inscribir
              </span>
            </label>
            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '.25rem .75rem', maxHeight: 190, overflowY: 'auto',
                border: '1px solid var(--borde)', borderRadius: 8, padding: '.6rem .75rem',
              }}
            >
              {cursos
                .filter((c) => c.id !== curso?.id && (c.kind === 'AREA' || c.kind === 'CIM'))
                .map((c) => (
                  <label key={c.id} className="casilla" style={{ marginBottom: 0, fontSize: '.9rem' }}>
                    <input
                      type="checkbox"
                      checked={requiereIds.includes(c.id)}
                      onChange={(e) =>
                        setRequiereIds((v) =>
                          e.target.checked ? [...v, c.id] : v.filter((x) => x !== c.id),
                        )
                      }
                    />
                    {c.codigo ? `${c.codigo} · ` : ''}{c.nombre}
                  </label>
                ))}
            </div>
            <span className="texto-suave" style={{ fontSize: '0.82rem' }}>
              {requiereIds.length === 0
                ? 'Sin antesala: se puede tomar de entrada.'
                : 'Solo los cursos base y el CIM sirven de requisito; un taller no acredita membresía.'}
            </span>
          </div>
        )}

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
