// Cliente para el backend de turnos (compartidos entre todos los dispositivos).
// Comparte la URL base con payments.ts (VITE_API_URL).
import { Appointment } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// El backend devuelve un row de SQLite donde los nulls vienen como null y los
// strings como "". Normalizamos al shape Appointment del frontend.
function normalize(row: any): Appointment {
  return {
    id: String(row.id),
    serviceId: String(row.serviceId ?? ''),
    serviceName: String(row.serviceName ?? ''),
    clientName: String(row.clientName ?? ''),
    clientPhone: row.clientPhone ?? '',
    clientEmail: row.clientEmail ?? '',
    date: String(row.date ?? ''),
    startTime: String(row.startTime ?? ''),
    endTime: String(row.endTime ?? ''),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    paymentStatus: row.paymentStatus ?? undefined,
    depositAmount: row.depositAmount ?? undefined,
    servicePrice: row.servicePrice ?? undefined,
    paymentId: row.paymentId ?? undefined,
    preferenceId: row.preferenceId ?? undefined,
    pendingExpiresAt: row.pendingExpiresAt ?? undefined,
  };
}

export async function fetchAppointments(signal?: AbortSignal): Promise<Appointment[]> {
  const res = await fetch(`${API_URL}/api/appointments`, { signal });
  if (!res.ok) throw new Error(`GET /api/appointments → ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(normalize) : [];
}

export async function createAppointmentRemote(appt: Appointment): Promise<Appointment> {
  const res = await fetch(`${API_URL}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(appt),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`POST /api/appointments → ${res.status} ${txt}`);
  }
  return normalize(await res.json());
}

export async function updateAppointmentRemote(
  id: string,
  patch: Partial<Pick<
    Appointment,
    'date' | 'startTime' | 'endTime' | 'paymentStatus' | 'paymentId' | 'preferenceId' | 'pendingExpiresAt'
  >>
): Promise<Appointment> {
  const res = await fetch(`${API_URL}/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`PUT /api/appointments → ${res.status} ${txt}`);
  }
  return normalize(await res.json());
}

export async function deleteAppointmentRemote(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/appointments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE /api/appointments → ${res.status}`);
  }
}
