import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict } from '../lib/errors.js';

/**
 * Hace que repetir una petición no la ejecute dos veces.
 *
 * El problema que resuelve: en el cerro no hay señal. Una app que envía la
 * lista de asistencia y pierde la conexión a medio camino **no puede saber si
 * llegó**. Si reintenta, corre el riesgo de duplicar; si no reintenta, corre el
 * riesgo de perder la lista. Sin una salida, las dos opciones son malas.
 *
 * La salida es que el cliente decida la identidad de la acción, no el servidor:
 * genera una clave al momento de tocar el botón y la manda en cada intento. La
 * primera vez se ejecuta y se guarda la respuesta; los intentos siguientes
 * devuelven esa misma respuesta sin volver a tocar nada.
 *
 * Es opcional a propósito. La web no la necesita —tiene red— y sin la cabecera
 * el middleware no hace nada.
 *
 * Una advertencia sobre la respuesta repetida: se guarda como `jsonb`, que no
 * conserva el orden de las llaves. El contenido es idéntico pero los bytes no,
 * así que no sirve para comparar firmas ni calcular un ETag sobre el cuerpo.
 * Para un cliente que parsea JSON —que es lo que hará la app— da igual.
 */

/** Cuánto se recuerda una respuesta. Más que cualquier salida razonable. */
export const DIAS_DE_MEMORIA = 7;

const CABECERA = 'idempotency-key';

/// Formato de la clave: se pide algo largo y sin sorpresas para que no llegue
/// una cadena vacía o un valor que colisione entre dos personas distintas.
const CLAVE_VALIDA = /^[A-Za-z0-9_-]{16,128}$/;

export function idempotencia(req: Request, res: Response, next: NextFunction) {
  const clave = req.header(CABECERA);
  if (!clave) return next();

  if (!CLAVE_VALIDA.test(clave)) {
    return next(
      badRequest(
        'La clave de idempotencia debe tener entre 16 y 128 caracteres (letras, numeros, guion o guion bajo)',
      ),
    );
  }

  const userId = req.user?.sub;
  if (!userId) return next();

  (async () => {
    const previa = await prisma.peticionIdempotente.findUnique({ where: { clave } });

    if (previa) {
      // La misma clave para otra cosa es un error del cliente, no un reintento.
      // Devolver la respuesta anterior aquí sería contestar una pregunta que
      // nadie hizo.
      if (previa.userId !== userId || previa.metodo !== req.method || previa.ruta !== req.originalUrl) {
        return next(conflict('Esa clave de idempotencia ya se uso para otra peticion'));
      }
      res.setHeader('Idempotencia', 'repetida');
      return res.status(previa.estado).json(previa.respuesta);
    }

    // Se envuelve res.json para quedarse con lo que la ruta responda, sin que
    // cada ruta tenga que acordarse de guardar nada.
    const jsonOriginal = res.json.bind(res);
    res.json = (cuerpo: unknown) => {
      // Solo se recuerdan las respuestas buenas: un 4xx que se corrige y se
      // reintenta con la misma clave debe poder pasar.
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.peticionIdempotente
          .create({
            data: {
              clave,
              userId,
              metodo: req.method,
              ruta: req.originalUrl,
              estado: res.statusCode,
              respuesta: cuerpo as never,
            },
          })
          .catch(() => {
            // Si dos intentos entran a la vez, uno pierde la carrera contra la
            // llave primaria. No es un error para el cliente: su petición sí se
            // atendió, y el otro intento recibirá la respuesta guardada.
          });
      }
      return jsonOriginal(cuerpo);
    };

    res.setHeader('Idempotencia', 'nueva');
    next();
  })().catch(next);
}

/**
 * Borra las claves viejas.
 *
 * La tabla es un registro de reintentos, no un archivo histórico: pasada una
 * semana ningún cliente va a repetir la petición y las filas solo estorban.
 */
export async function purgarIdempotencia(dias = DIAS_DE_MEMORIA) {
  const corte = new Date();
  corte.setDate(corte.getDate() - dias);
  const { count } = await prisma.peticionIdempotente.deleteMany({
    where: { createdAt: { lt: corte } },
  });
  return count;
}
