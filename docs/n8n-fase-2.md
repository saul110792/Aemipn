# n8n — fase 2

Todavía **no está integrado**. Este documento deja anotado el plan y los puntos donde engancharlo,
para que la fase 2 no obligue a rediseñar nada.

## La frontera

La API de Node es la dueña de los datos: valida, autoriza y escribe en Postgres. n8n se encarga de
lo que pasa *después* de un cambio — avisar, recordar, reportar. n8n nunca escribe directo en la
base; siempre pasa por la API.

## Qué automatizar

| Disparador | Automatización |
|---|---|
| Llega una solicitud de ingreso | Acuse al aspirante y aviso a la mesa directiva |
| Se acepta una solicitud | Correo de bienvenida con los datos del próximo CIM |
| Se abre una edición del CIM | Difusión por correo y redes |
| 48 h antes de una salida | Recordatorio con lugar, hora y qué llevar |
| Inscripción con pago pendiente | Recordatorio de cuota al miembro y corte al tesorero del área |
| Cada lunes | Reporte de altas, bajas y pagos a la mesa directiva |
| Termina una edición | Constancias a los acreditados |

## Cómo engancharlo

Ya hay variables reservadas en `apps/api/.env.example`:

```
N8N_WEBHOOK_URL=""
N8N_SHARED_SECRET=""
```

El patrón sugerido es un módulo `apps/api/src/lib/eventos.ts` que dispare un webhook **después** de
que la transacción se haya confirmado, sin bloquear la respuesta HTTP:

```ts
export async function emitir(evento: string, datos: unknown) {
  if (!env.N8N_WEBHOOK_URL) return;          // sin configurar, no hace nada
  try {
    await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AEMIPN-Secret': env.N8N_SHARED_SECRET,
      },
      body: JSON.stringify({ evento, datos, ts: new Date().toISOString() }),
    });
  } catch (e) {
    // Que falle una notificación nunca debe tumbar la operación principal.
    console.error('[n8n] no se pudo emitir', evento, e);
  }
}
```

Puntos de llamada naturales:

- `public.routes.ts` → después de crear la solicitud: `solicitud.recibida`
- `applications.routes.ts` → tras aceptar: `solicitud.aceptada`
- `enrollments.routes.ts` → tras inscribir: `inscripcion.creada`; al marcar pagado: `pago.registrado`
- `editions.routes.ts` → al pasar a `INSCRIPCIONES_ABIERTAS`: `edicion.publicada`

Para lo programado (recordatorios, reporte semanal), n8n consulta la API con un usuario `STAFF`
dedicado en lugar de esperar un webhook.

## Seguridad

- Verificar `X-AEMIPN-Secret` en n8n antes de actuar sobre un webhook.
- Si n8n necesita escribir, que use un usuario `STAFF` propio y su token, no uno de persona.
- No mandar datos médicos ni contactos de emergencia a servicios externos sin necesidad real.
