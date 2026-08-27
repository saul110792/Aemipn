import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Area, Course, CourseEdition } from '../lib/types';
import { ErrorAviso } from './Estado';

interface ClaveSugerida {
  clave: string;
  codigo: string;
  anio: number;
  codigoProvisional: boolean;
}

/**
 * Alta de una edición de curso.
 * La clave se propone sola a partir del código del curso y del año
 * (CBER + 2026 + primera del año = CBER_2026A) pero queda editable:
 * el catálogo oficial de códigos puede diferir del provisional.
 */
export function FormularioEdicion({ onListo }: { onListo?: (e: CourseEdition) => void }) {
  const qc = useQueryClient();
  const [areaId, setAreaId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [clave, setClave] = useState('');
  const [claveTocada, setClaveTocada] = useState(false);
  const [form, setForm] = useState({
    fechaInicio: '', fechaFin: '', cupo: '', sede: '',
    estado: 'BORRADOR' as CourseEdition['estado'],
  });

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: () => api.get<Area[]>('/areas') });
  const { data: cursos } = useQuery({ queryKey: ['courses'], queryFn: () => api.get<Course[]>('/courses') });

  // Un curso sin área es transversal (el CIM) y debe poder elegirse siempre.
  const cursosVisibles = (cursos ?? []).filter(
    (c) => !areaId || c.area?.slug === areas?.find((a) => a.id === areaId)?.slug,
  );

  const anio = form.fechaInicio ? new Date(form.fechaInicio).getFullYear() : new Date().getFullYear();

  const { data: sugerida } = useQuery({
    queryKey: ['clave', courseId, anio],
    queryFn: () => api.get<ClaveSugerida>(`/courses/${courseId}/siguiente-clave?anio=${anio}`),
    enabled: Boolean(courseId),
  });

  // Mientras nadie escriba la clave a mano, sigue a la sugerencia.
  useEffect(() => {
    if (sugerida && !claveTocada) setClave(sugerida.clave);
  }, [sugerida?.clave, claveTocada]);

  const crear = useMutation({
    mutationFn: () =>
      api.post<CourseEdition>('/editions', {
        courseId,
        clave,
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        sede: form.sede || null,
        cupo: form.cupo ? Number(form.cupo) : null,
        estado: form.estado,
      }),
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['editions'] });
      qc.invalidateQueries({ queryKey: ['clave'] });
      onListo?.(e);
    },
  });

  // Enumerar solo lo que falta de verdad; un aviso genérico confunde.
  const faltantes = [
    !courseId && 'el curso',
    !clave.trim() && 'la clave',
    !form.fechaInicio && 'la fecha de inicio',
    !form.fechaFin && 'la fecha de fin',
  ].filter((x): x is string => Boolean(x));
  const listo = faltantes.length === 0;

  return (
    <div className="tarjeta" style={{ marginBottom: '1.5rem' }}>
      <div className="tarjeta-cuerpo">
        <h3>Nueva edición de curso</h3>
        {crear.error != null && <ErrorAviso error={crear.error} />}

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="ed-area">Área</label>
            <select
              id="ed-area"
              value={areaId}
              onChange={(e) => { setAreaId(e.target.value); setCourseId(''); setClaveTocada(false); }}
            >
              <option value="">Todas las áreas</option>
              {areas?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.codigo ? `${a.codigo} · ` : ''}{a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="ed-curso">Curso *</label>
            <select
              id="ed-curso"
              value={courseId}
              onChange={(e) => { setCourseId(e.target.value); setClaveTocada(false); }}
            >
              <option value="">Elige un curso…</option>
              {cursosVisibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo ? `${c.codigo} · ` : ''}{c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="ed-clave">
            Clave de la edición *
            <span className="texto-suave" style={{ fontWeight: 400 }}> — código del curso, año y letra</span>
          </label>
          <input
            id="ed-clave"
            value={clave}
            placeholder="CBER_2026A"
            onChange={(e) => { setClave(e.target.value.toUpperCase()); setClaveTocada(true); }}
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.04em' }}
          />
          {sugerida && (
            <span className="texto-suave" style={{ fontSize: '0.83rem' }}>
              Sugerida: <strong>{sugerida.clave}</strong>
              {clave !== sugerida.clave && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => { setClave(sugerida.clave); setClaveTocada(false); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--guinda-600)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}
                  >
                    usar la sugerida
                  </button>
                </>
              )}
              {sugerida.codigoProvisional && ' · el curso aún no tiene código propio'}
            </span>
          )}
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="ed-ini">Inicio *</label>
            <input id="ed-ini" type="date" value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="ed-fin">Fin *</label>
            <input id="ed-fin" type="date" value={form.fechaFin}
              onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="ed-cupo">Cupo</label>
            <input id="ed-cupo" type="number" min="1" value={form.cupo}
              onChange={(e) => setForm({ ...form, cupo: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="ed-sede">Sede</label>
            <input id="ed-sede" value={form.sede}
              placeholder="Los Dinamos, Magdalena Contreras"
              onChange={(e) => setForm({ ...form, sede: e.target.value })} />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="ed-sede">Sede</label>
          <input id="ed-sede" value={form.sede} placeholder="Los Dinamos y ESIA Zacatenco"
            onChange={(e) => setForm({ ...form, sede: e.target.value })} />
        </div>

        <div className="campo" style={{ maxWidth: 260 }}>
          <label htmlFor="ed-estado">Estado</label>
          <select id="ed-estado" value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value as CourseEdition['estado'] })}>
            <option value="BORRADOR">Borrador</option>
            <option value="INSCRIPCIONES_ABIERTAS">Inscripciones abiertas</option>
            <option value="EN_CURSO">En curso</option>
          </select>
        </div>

        <button type="button" className="btn btn-verde" disabled={!listo || crear.isPending}
          onClick={() => crear.mutate()}>
          {crear.isPending ? 'Creando…' : 'Crear edición'}
        </button>
        {!listo && (
          <span className="texto-suave" style={{ marginLeft: '0.7rem', fontSize: '0.85rem' }}>
            {faltantes.length === 1 ? 'Falta ' : 'Faltan '}
            {faltantes.length > 1
              ? `${faltantes.slice(0, -1).join(', ')} y ${faltantes.at(-1)}`
              : faltantes[0]}
            .
          </span>
        )}
      </div>
    </div>
  );
}
