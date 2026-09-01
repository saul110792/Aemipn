import { api } from './api';

export interface ConfigPush {
  disponible: boolean;
  clavePublica: string | null;
}

/** El navegador exige la llave VAPID como Uint8Array, no como el base64url que da la API. */
function comoUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** ¿Este navegador puede recibir push? (Safari en iPhone: solo si ya se instaló). */
export function soportaPush(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** La suscripción activa en este dispositivo, o null si nunca se activó. */
export async function suscripcionActual(): Promise<PushSubscription | null> {
  if (!soportaPush()) return null;
  const registro = await navigator.serviceWorker.ready;
  return registro.pushManager.getSubscription();
}

/** Pide permiso y activa el push en este dispositivo. */
export async function activarPush(): Promise<PushSubscription> {
  const { clavePublica } = await api.get<ConfigPush>('/push/config');
  if (!clavePublica) throw new Error('Las notificaciones no están configuradas en el servidor.');

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('No diste permiso para las notificaciones.');

  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: comoUint8Array(clavePublica),
  });

  await api.post('/push/suscripciones', suscripcion.toJSON());
  return suscripcion;
}

/** Apaga el push en este dispositivo. */
export async function desactivarPush(): Promise<void> {
  const suscripcion = await suscripcionActual();
  if (!suscripcion) return;
  await api.delete(`/push/suscripciones?endpoint=${encodeURIComponent(suscripcion.endpoint)}`);
  await suscripcion.unsubscribe();
}
