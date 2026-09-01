/**
 * Genera y descarga un archivo .ics para que el calendario del celular
 * (Google Calendar / Apple Calendar) importe el evento, con recordatorio
 * incluido -- el recordatorio lo maneja el propio calendario del sistema,
 * no hace falta notificaciones push para esto.
 */

interface EventoParaICS {
  titulo: string;
  descripcion?: string | null;
  /** Dirección física o liga de videoconferencia; lo que haya. */
  lugar?: string | null;
  /** ISO 8601. */
  inicio: string;
  /** ISO 8601; si falta, se asume una hora de duración. */
  fin?: string | null;
}

/** YYYYMMDDTHHMMSSZ, como pide RFC 5545 para una fecha en UTC. */
function fechaICS(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Escapa los caracteres que RFC 5545 reserva dentro de un valor de texto. */
function escaparICS(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function alarma(disparo: string): string {
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Recordatorio', `TRIGGER:${disparo}`, 'END:VALARM'].join(
    '\r\n',
  );
}

export function descargarICS(evento: EventoParaICS) {
  const inicio = fechaICS(evento.inicio);
  const fin = fechaICS(evento.fin ?? new Date(new Date(evento.inicio).getTime() + 60 * 60 * 1000).toISOString());
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@aemipn.mx`;

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AEMIPN//Eventos//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fechaICS(new Date().toISOString())}`,
    `DTSTART:${inicio}`,
    `DTEND:${fin}`,
    `SUMMARY:${escaparICS(evento.titulo)}`,
    ...(evento.descripcion ? [`DESCRIPTION:${escaparICS(evento.descripcion)}`] : []),
    ...(evento.lugar ? [`LOCATION:${escaparICS(evento.lugar)}`] : []),
    // Un día antes y una hora antes: suficiente para no dejarlo para el
    // recordatorio único y aun así avisar con tiempo de sobra para prepararse.
    alarma('-P1D'),
    alarma('-PT1H'),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([lineas.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${evento.titulo.replace(/[^\w\- ]/g, '').trim() || 'evento'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
