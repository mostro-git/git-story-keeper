// Cliente para tu backend de pagos (Mercado Pago)
// La URL del backend se configura en .env como VITE_API_URL
// Ejemplo: VITE_API_URL=https://api.tudominio.com  (en producción)
//          VITE_API_URL=http://localhost:3000      (en desarrollo)

import { Appointment } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


// Helper: token JWT del panel (sessionStorage) para llamadas admin.
function adminAuthHeaders(): Record<string, string> {
  if (typeof sessionStorage === 'undefined') return {};
  const t = sessionStorage.getItem('admin_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export const DEPOSIT_PERCENTAGE = 0.5; // 50% de seña

export function calculateDeposit(price: number): number {
  return Math.round(price * DEPOSIT_PERCENTAGE);
}

export interface CreatePreferencePayload {
  appointmentId: string;
  serviceName: string;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  startTime: string;
  // URLs de retorno (frontend las arma con su origin actual)
  successUrl: string;
  pendingUrl: string;
  failureUrl: string;
}

export interface CreatePreferenceResponse {
  preferenceId: string;
  initPoint: string; // URL de checkout MP (producción)
  sandboxInitPoint?: string; // URL sandbox (testing)
}

/**
 * Llama a tu backend para crear una preferencia de pago en Mercado Pago.
 * El backend usa el ACCESS_TOKEN de MP (privado) para crearla.
 */
export async function createPaymentPreference(
  payload: CreatePreferencePayload
): Promise<CreatePreferenceResponse> {
  const res = await fetch(`${API_URL}/api/payments/create-preference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo crear la preferencia de pago: ${text}`);
  }
  return res.json();
}

/**
 * Consulta el estado de pago de un turno.
 * Útil en la página de retorno para confirmar antes de mostrar OK al cliente.
 */
export async function fetchPaymentStatus(
  appointmentId: string
): Promise<{ status: 'pending' | 'paid' | 'failed'; paymentId?: string }> {
  const res = await fetch(
    `${API_URL}/api/payments/status/${encodeURIComponent(appointmentId)}`
  );
  if (!res.ok) throw new Error('No se pudo consultar el estado del pago');
  return res.json();
}

/**
 * Envía un mail de confirmación para turnos manuales (sin pago MP).
 * Si el cliente no cargó email, el backend lo ignora.
 * No bloquea el flujo si falla — solo loguea.
 */
export async function sendManualConfirmationEmail(payload: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  // Mandamos siempre: el backend decide si manda mail (Gmail) y/o SMS/WhatsApp (Twilio)
  if (!payload.clientEmail && !payload.clientPhone) return;
  try {
    await fetch(`${API_URL}/api/notifications/send-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[mail] no se pudo notificar:', err);
  }
}

/**
 * Notifica al cliente que su turno fue reprogramado (email + WhatsApp).
 * No bloquea el flujo si falla.
 */
export async function sendRescheduleNotification(payload: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  oldDate: string;
  oldStartTime: string;
  date: string;
  startTime: string;
}): Promise<void> {
  if (!payload.clientEmail && !payload.clientPhone) return;
  try {
    await fetch(`${API_URL}/api/notifications/send-reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[reschedule-notify] no se pudo notificar:', err);
  }
}

/**
 * Notifica al cliente que su turno fue cancelado (email + WhatsApp).
 * No bloquea el flujo si falla.
 */
export async function sendCancellationNotification(payload: {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceName: string;
  date: string;
  startTime: string;
}): Promise<void> {
  if (!payload.clientEmail && !payload.clientPhone) return;
  try {
    await fetch(`${API_URL}/api/notifications/send-cancellation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[cancel-notify] no se pudo notificar:', err);
  }
}

export type { Appointment };
