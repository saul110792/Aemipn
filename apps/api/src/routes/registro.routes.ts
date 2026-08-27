import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { crearYEnviarVerificacion, verificar } from '../lib/verificacion.js';
import { exponeCodigosDePrueba } from '../lib/env.js';

/** Registro y confirmación de cuenta. Todo esto ocurre sin sesión. */
export const registroRouter = Router();

const limitador = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde este equipo. Intenta mas tarde.' },
});

const registroSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidoPaterno: z.string().min(1, 'El apellido paterno es obligatorio'),
  apellidoMaterno: z.string().optional().nullable(),
  email: z.string().email('Correo invalido'),
  telefono: z.string().optional().nullable(),
  boleta: z.string().optional().nullable(),
  escuela: z.string().optional().nullable(),
  password: z.string().min(8, 'La contrasena debe tener al menos 8 caracteres'),
});

/**
 * POST /api/registro
 *
 * Crea el miembro y su cuenta, pero la deja inactiva hasta confirmar el correo.
 * La respuesta es igual exista o no ya ese correo: si dijera "ya está
 * registrado" cualquiera podría averiguar quién pertenece a la asociación.
 */
registroRouter.post(
  '/',
  limitador,
  validate(registroSchema),
  asyncHandler(async (req, res) => {
    const datos = req.body as z.infer<typeof registroSchema>;
    const email = datos.email.toLowerCase();

    const respuestaNeutra = {
      ok: true,
      mensaje: 'Te enviamos un correo con la liga y el codigo para confirmar tu cuenta.',
    };

    const yaExiste = await prisma.user.findUnique({
      where: { email },
      include: { member: true },
    });

    if (yaExiste) {
      // Si nunca confirmó, se le manda otra verificación. Si ya está activa,
      // no se hace nada, pero por fuera se ve igual.
      if (!yaExiste.emailVerificadoEn) {
        await crearYEnviarVerificacion(yaExiste.id, email, yaExiste.member?.nombre ?? 'hola');
      }
      return res.status(201).json(respuestaNeutra);
    }

    const miembroExistente = await prisma.member.findUnique({ where: { email } });

    const { user, member } = await prisma.$transaction(async (tx) => {
      // Alguien capturado antes por la mesa directiva puede registrarse
      // después: se enlaza a su ficha en vez de duplicarla.
      const member =
        miembroExistente ??
        (await tx.member.create({
          data: {
            nombre: datos.nombre,
            apellidoPaterno: datos.apellidoPaterno,
            apellidoMaterno: datos.apellidoMaterno,
            email,
            telefono: datos.telefono,
            boleta: datos.boleta,
            escuela: datos.escuela,
            status: 'ASPIRANTE',
          },
        }));

      const user = await tx.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(datos.password, 12),
          // Sin curso aprobado todavía: de momento solo ve lo del CIM.
          role: 'CIM',
          activo: false,
          memberId: member.id,
        },
      });

      return { user, member };
    });

    const v = await crearYEnviarVerificacion(user.id, email, member.nombre);

    res.status(201).json({
      ...respuestaNeutra,
      // Solo con EXPONER_CODIGOS_DE_PRUEBA=true, y nunca en produccion.
      ...(exponeCodigosDePrueba ? { _pruebas: { token: v.token, codigo: v.codigo } } : {}),
    });
  }),
);

const verificarSchema = z
  .object({
    token: z.string().optional(),
    codigo: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((d) => d.token || (d.codigo && d.email), {
    message: 'Hace falta la liga de confirmacion, o el codigo junto con tu correo',
  });

const MOTIVOS: Record<string, string> = {
  NO_ENCONTRADA: 'La liga o el codigo no son validos.',
  EXPIRADA: 'La liga vencio. Pide una nueva desde el formulario.',
  YA_USADA: 'Esta cuenta ya habia sido confirmada. Puedes iniciar sesion.',
  DEMASIADOS_INTENTOS: 'Demasiados intentos con este codigo. Pide uno nuevo.',
};

/** POST /api/registro/verificar — por liga o por codigo. */
registroRouter.post(
  '/verificar',
  limitador,
  validate(verificarSchema),
  asyncHandler(async (req, res) => {
    const d = req.body as z.infer<typeof verificarSchema>;

    const r = await verificar(
      d.token ? { token: d.token } : { codigo: d.codigo!, email: d.email! },
    );

    if (!r.ok) throw badRequest(MOTIVOS[r.motivo] ?? 'No se pudo confirmar la cuenta.');

    res.json({
      ok: true,
      mensaje: 'Cuenta confirmada. Ya puedes iniciar sesion y completar tu perfil.',
    });
  }),
);

/** POST /api/registro/reenviar — otra liga si la anterior vencio. */
registroRouter.post(
  '/reenviar',
  limitador,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const email = (req.body.email as string).toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { member: true } });

    if (user && !user.emailVerificadoEn) {
      await crearYEnviarVerificacion(user.id, email, user.member?.nombre ?? 'hola');
    }

    // Respuesta igual exista o no, por la misma razon que en el registro.
    res.json({ ok: true, mensaje: 'Si esa cuenta esta pendiente de confirmar, te enviamos otra liga.' });
  }),
);
