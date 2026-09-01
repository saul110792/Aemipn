# Correo

## Los tres motores

[`correo.ts`](../apps/api/src/lib/correo.ts) prueba en este orden, y usa el primero que
encuentre configurado:

| Motor | Se activa con | Cuándo usarlo |
|---|---|---|
| Brevo (API HTTP) | `BREVO_API_KEY` | Render y cualquier host cuyo plan gratis bloquee los puertos SMTP |
| SMTP | `SMTP_URL` | Este equipo, un plan de pago de Render, o cualquier host sin ese bloqueo |
| Consola | (ninguna de las anteriores) | Desarrollo local: el mensaje se imprime en la terminal, con liga y código |

La firma de `enviarCorreo()` no cambia entre motores — el resto del código nunca se entera de
cuál está activo.

## Por qué Brevo y no solo SMTP

El plan **free** de Render bloquea las conexiones salientes a los puertos SMTP (25, 465, 587)
desde septiembre de 2025. Gmail, Outlook o cualquier proveedor por SMTP normal simplemente no
pueden salir desde ahí, sin importar qué tan bien esté configurada la variable — el error es un
`ETIMEDOUT` al conectar, no un rechazo de usuario/contraseña.

La API de Brevo viaja por HTTPS (puerto 443), que nunca se bloquea. Por eso `BREVO_API_KEY` tiene
prioridad sobre `SMTP_URL` cuando ambas están presentes: es la que de verdad funciona en el plan
gratuito.

> Si subes `aemipn-api` a un plan de pago de Render, los puertos SMTP sí abren (salvo el 25, que
> Render bloquea siempre por correr sobre AWS EC2) y `SMTP_URL` vuelve a ser una opción — pero no
> hace falta cambiar nada: basta con no definir `BREVO_API_KEY` y sí `SMTP_URL`.

## Configurar Brevo

1. Crea una cuenta gratis en [brevo.com](https://www.brevo.com) (300 correos/día, sin tarjeta).
2. **Verifica un remitente**: en el panel de Brevo, *Senders, Domains & Dedicated IPs → Senders →
   Add a sender*. Con el correo que uses ahí (por ejemplo tu Gmail) te llega un mensaje de
   confirmación — sin verificarlo, Brevo rechaza el envío.
3. Genera una API key: *SMTP & API → API Keys → Generate a new API key*.
4. En Render, servicio `aemipn-api` → *Environment*, agrega `BREVO_API_KEY` con esa clave.
5. `SMTP_REMITENTE` debe usar el correo que verificaste en el paso 2 — Brevo rechaza remitentes
   no verificados aunque la API key sea válida.

## Configurar SMTP con Gmail (equipos sin el bloqueo de puertos)

1. Activa verificación en dos pasos en la cuenta de Google.
2. Genera una contraseña de aplicación en
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — 16
   caracteres, **sin espacios** al copiarla (Google los muestra agrupados solo para lectura).
3. Arma `SMTP_URL` con el esquema `smtps://` (TLS directo, puerto 465) y el correo codificado
   (`@` → `%40`, por ir dentro de una URL):

   ```
   smtps://tu.correo%40gmail.com:contraseñadeaplicacion@smtp.gmail.com:465
   ```
4. `SMTP_REMITENTE` debe ser esa misma cuenta — Gmail rechaza o reescribe el remitente si no
   coincide con la cuenta autenticada.

### Por qué el transporte SMTP resuelve la IP a mano

`nodemailer` resuelve el host y, si encuentra direcciones IPv4 e IPv6, **elige una al azar**
entre las dos (ver su función interna `formatDNSValue`). Muchos entornos en la nube anuncian una
interfaz IPv6 sin salida real a internet: la mitad de las veces le toca una IP v6 de Gmail y la
conexión truena con `ENETUNREACH`, aunque el usuario y la contraseña sean correctos.
`crearTransporteSmtp()` en `correo.ts` resuelve la IPv4 con `node:dns/promises` y conecta
directo a ella, dejando el hostname original solo para el SNI/TLS.

## Probar sin buzón

Sin `BREVO_API_KEY` ni `SMTP_URL`, cualquier registro o reenvío imprime el mensaje completo —
liga y código incluidos — en la consola del servidor (`npm run dev` en local, o los *Logs* del
servicio en Render). Es la forma más rápida de probar el flujo sin depender de un correo real.
