// Cliente para los endpoints de configuración del panel (servicios, horarios,
// días bloqueados, especiales). Todo persiste en backend SQLite.
import { Service, Schedule, BlockedDate, SpecialService, Section, SpecialCategory, Promotion, UniqueService } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders(): Record<string, string> {
  const t = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${res.status} ${t}`);
  }
  return res.json();
}

// ───── Services ─────
export const fetchServices = (): Promise<Service[]> =>
  fetch(`${API_URL}/api/services`).then(json<Service[]>);

export const upsertServiceRemote = (s: Service): Promise<Service> =>
  fetch(`${API_URL}/api/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(s),
  }).then(json<Service>);

export const deleteServiceRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Special services ─────
export const fetchSpecialServices = (): Promise<SpecialService[]> =>
  fetch(`${API_URL}/api/special-services`).then(json<SpecialService[]>);

export const upsertSpecialServiceRemote = (s: SpecialService): Promise<SpecialService> =>
  fetch(`${API_URL}/api/special-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(s),
  }).then(json<SpecialService>);

export const deleteSpecialServiceRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/special-services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Schedule ─────
export const fetchSchedule = (): Promise<Schedule[]> =>
  fetch(`${API_URL}/api/schedule`).then(json<Schedule[]>);

export const saveScheduleRemote = (schedule: Schedule[]): Promise<Schedule[]> =>
  fetch(`${API_URL}/api/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ schedule }),
  }).then(json<Schedule[]>);

// ───── Blocked dates ─────
export const fetchBlockedDates = (): Promise<BlockedDate[]> =>
  fetch(`${API_URL}/api/blocked-dates`).then(json<BlockedDate[]>);

export const addBlockedDateRemote = (b: BlockedDate): Promise<BlockedDate> =>
  fetch(`${API_URL}/api/blocked-dates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(b),
  }).then(json<BlockedDate>);

export const removeBlockedDateRemote = (date: string): Promise<void> =>
  fetch(`${API_URL}/api/blocked-dates/${encodeURIComponent(date)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Appointments (extra) ─────
export const markAppointmentDoneRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/appointments/${encodeURIComponent(id)}/done`, {
    method: 'POST',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Sections ─────
export const fetchSections = (): Promise<Section[]> =>
  fetch(`${API_URL}/api/sections`).then(json<Section[]>);

export const upsertSectionRemote = (s: Section): Promise<Section> =>
  fetch(`${API_URL}/api/sections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(s),
  }).then(json<Section>);

export const deleteSectionRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/sections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Special Categories ─────

export const fetchSpecialCategories = (): Promise<SpecialCategory[]> =>
  fetch(`${API_URL}/api/special-categories`).then(json<SpecialCategory[]>);

export const upsertSpecialCategoryRemote = (s: SpecialCategory): Promise<SpecialCategory> =>
  fetch(`${API_URL}/api/special-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(s),
  }).then(json<SpecialCategory>);

export const deleteSpecialCategoryRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/special-categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Promotions ─────
export const fetchPromotions = (): Promise<Promotion[]> =>
  fetch(`${API_URL}/api/promotions`).then(json<Promotion[]>);

export const upsertPromotionRemote = (p: Promotion): Promise<Promotion> =>
  fetch(`${API_URL}/api/promotions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(p),
  }).then(json<Promotion>);

export const deletePromotionRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/promotions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);

// ───── Unique Services ─────
export const fetchUniqueServices = (): Promise<UniqueService[]> =>
  fetch(`${API_URL}/api/unique-services`).then(json<UniqueService[]>);

export const upsertUniqueServiceRemote = (u: UniqueService): Promise<UniqueService> =>
  fetch(`${API_URL}/api/unique-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(u),
  }).then(json<UniqueService>);

export const deleteUniqueServiceRemote = (id: string): Promise<void> =>
  fetch(`${API_URL}/api/unique-services/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(() => undefined);
