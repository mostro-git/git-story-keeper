import { create } from 'zustand';
import { Service, Appointment, Schedule, SpecialService, BlockedDate, Section, SpecialCategory, Promotion, UniqueService } from '@/types';
import {
  fetchAppointments, createAppointmentRemote,
  updateAppointmentRemote, deleteAppointmentRemote,
} from '@/lib/appointmentsApi';
import {
  fetchServices, upsertServiceRemote, deleteServiceRemote,
  fetchSpecialServices, upsertSpecialServiceRemote, deleteSpecialServiceRemote,
  fetchSchedule, saveScheduleRemote,
  fetchBlockedDates, addBlockedDateRemote, removeBlockedDateRemote,
  fetchSections, upsertSectionRemote, deleteSectionRemote,
  fetchSpecialCategories, upsertSpecialCategoryRemote, deleteSpecialCategoryRemote,
  fetchPromotions, upsertPromotionRemote, deletePromotionRemote,
  fetchUniqueServices, upsertUniqueServiceRemote, deleteUniqueServiceRemote,
} from '@/lib/configApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'admin_token';

const defaultSchedule: Schedule[] = [
  { id: '0', dayOfWeek: 0, slots: [] },
  { id: '1', dayOfWeek: 1, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
  { id: '2', dayOfWeek: 2, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
  { id: '3', dayOfWeek: 3, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
  { id: '4', dayOfWeek: 4, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
  { id: '5', dayOfWeek: 5, slots: [{ startTime: '09:00', endTime: '18:00', enabled: true }] },
  { id: '6', dayOfWeek: 6, slots: [{ startTime: '09:00', endTime: '14:00', enabled: true }] },
];

interface StoreState {
  // Catálogo
  services: Service[];
  syncServices: () => Promise<void>;
  addService: (s: Service) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  removeService: (id: string) => void;

  sections: Section[];
  syncSections: () => Promise<void>;
  addSection: (s: Section) => void;
  updateSection: (id: string, patch: Partial<Section>) => void;
  removeSection: (id: string) => void;

  specialCategories: SpecialCategory[];
  syncSpecialCategories: () => Promise<void>;
  addSpecialCategory: (s: SpecialCategory) => void;
  updateSpecialCategory: (id: string, patch: Partial<SpecialCategory>) => void;
  removeSpecialCategory: (id: string) => void;

  promotions: Promotion[];
  syncPromotions: () => Promise<void>;
  addPromotion: (p: Promotion) => void;
  updatePromotion: (id: string, patch: Partial<Promotion>) => void;
  removePromotion: (id: string) => void;

  uniqueServices: UniqueService[];
  syncUniqueServices: () => Promise<void>;
  addUniqueService: (u: UniqueService) => void;
  updateUniqueService: (id: string, patch: Partial<UniqueService>) => void;
  removeUniqueService: (id: string) => void;

  specialServices: SpecialService[];
  syncSpecialServices: () => Promise<void>;
  addSpecialService: (s: SpecialService) => void;
  updateSpecialService: (id: string, patch: Partial<SpecialService>) => void;
  removeSpecialService: (id: string) => void;

  // Horarios
  schedule: Schedule[];
  syncSchedule: () => Promise<void>;
  setSchedule: (s: Schedule[]) => void;
  updateDaySchedule: (dayOfWeek: number, slots: Schedule['slots']) => void;

  // Bloqueos
  blockedDates: BlockedDate[];
  syncBlockedDates: () => Promise<void>;
  addBlockedDate: (b: BlockedDate) => void;
  removeBlockedDate: (date: string) => void;

  // Turnos
  appointments: Appointment[];
  appointmentsLoaded: boolean;
  appointmentsError: string | null;
  syncAppointments: () => Promise<void>;
  addAppointment: (a: Appointment) => void;
  removeAppointment: (id: string) => void;
  updateAppointmentPayment: (id: string, updates: Partial<Appointment>) => void;
  rescheduleAppointment: (id: string, patch: { date: string; startTime: string; endTime: string }) => void;
  cleanupExpiredPending: () => void;

  // Auth (contraseña única)
  isAuthenticated: boolean;
  adminUser: { scope: string } | null;
  login: (passwordOrUsername: string, maybePassword?: string) => Promise<boolean>;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  // ───── Services ─────
  services: [],
  syncServices: async () => {
    try { set({ services: await fetchServices() }); }
    catch (e) { console.warn('[syncServices]', e); }
  },
  addService: (s) => {
    set((st) => ({ services: [...st.services, s] }));
    upsertServiceRemote(s).then(() => get().syncServices()).catch(console.warn);
  },
  updateService: (id, patch) => {
    const cur = get().services.find((s) => s.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ services: st.services.map((s) => (s.id === id ? next : s)) }));
    upsertServiceRemote(next).then(() => get().syncServices()).catch(console.warn);
  },
  removeService: (id) => {
    set((st) => ({ services: st.services.filter((s) => s.id !== id) }));
    deleteServiceRemote(id).catch(console.warn);
  },

  // ───── Special services ─────
  specialServices: [],
  syncSpecialServices: async () => {
    try { set({ specialServices: await fetchSpecialServices() }); }
    catch (e) { console.warn('[syncSpecialServices]', e); }
  },
  addSpecialService: (s) => {
    set((st) => ({ specialServices: [...st.specialServices, s] }));
    upsertSpecialServiceRemote(s).then(() => get().syncSpecialServices()).catch(console.warn);
  },
  updateSpecialService: (id, patch) => {
    const cur = get().specialServices.find((s) => s.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ specialServices: st.specialServices.map((s) => (s.id === id ? next : s)) }));
    upsertSpecialServiceRemote(next).then(() => get().syncSpecialServices()).catch(console.warn);
  },
  removeSpecialService: (id) => {
    set((st) => ({ specialServices: st.specialServices.filter((s) => s.id !== id) }));
    deleteSpecialServiceRemote(id).catch(console.warn);
  },



  // ───── Special Categories ─────
  specialCategories: [],
  syncSpecialCategories: async () => {
    try { set({ specialCategories: await fetchSpecialCategories() }); }
    catch (e) { console.warn('[syncSpecialCategories]', e); }
  },
  addSpecialCategory: (s) => {
    set((st) => ({ specialCategories: [...st.specialCategories, s] }));
    upsertSpecialCategoryRemote(s).then(() => get().syncSpecialCategories()).catch(console.warn);
  },
  updateSpecialCategory: (id, patch) => {
    const cur = get().specialCategories.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ specialCategories: st.specialCategories.map((x) => (x.id === id ? next : x)) }));
    upsertSpecialCategoryRemote(next).then(() => get().syncSpecialCategories()).catch(console.warn);
  },
  removeSpecialCategory: (id) => {
    set((st) => ({ specialCategories: st.specialCategories.filter((x) => x.id !== id) }));
    deleteSpecialCategoryRemote(id).then(() => { get().syncSpecialCategories(); get().syncSpecialServices(); }).catch(console.warn);
  },

  // ───── Promotions ─────
  promotions: [],
  syncPromotions: async () => {
    try { set({ promotions: await fetchPromotions() }); }
    catch (e) { console.warn('[syncPromotions]', e); }
  },
  addPromotion: (p) => {
    set((st) => ({ promotions: [...st.promotions, p] }));
    upsertPromotionRemote(p).then(() => get().syncPromotions()).catch(console.warn);
  },
  updatePromotion: (id, patch) => {
    const cur = get().promotions.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ promotions: st.promotions.map((x) => (x.id === id ? next : x)) }));
    upsertPromotionRemote(next).then(() => get().syncPromotions()).catch(console.warn);
  },
  removePromotion: (id) => {
    set((st) => ({ promotions: st.promotions.filter((x) => x.id !== id) }));
    deletePromotionRemote(id).then(() => get().syncPromotions()).catch(console.warn);
  },

  // ───── Unique Services ─────
  uniqueServices: [],
  syncUniqueServices: async () => {
    try { set({ uniqueServices: await fetchUniqueServices() }); }
    catch (e) { console.warn('[syncUniqueServices]', e); }
  },
  addUniqueService: (u) => {
    set((st) => ({ uniqueServices: [...st.uniqueServices, u] }));
    upsertUniqueServiceRemote(u).then(() => get().syncUniqueServices()).catch(console.warn);
  },
  updateUniqueService: (id, patch) => {
    const cur = get().uniqueServices.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ uniqueServices: st.uniqueServices.map((x) => (x.id === id ? next : x)) }));
    upsertUniqueServiceRemote(next).then(() => get().syncUniqueServices()).catch(console.warn);
  },
  removeUniqueService: (id) => {
    set((st) => ({ uniqueServices: st.uniqueServices.filter((x) => x.id !== id) }));
    deleteUniqueServiceRemote(id).then(() => get().syncUniqueServices()).catch(console.warn);
  },

  // ───── Sections ─────
  sections: [],
  syncSections: async () => {
    try { set({ sections: await fetchSections() }); }
    catch (e) { console.warn('[syncSections]', e); }
  },
  addSection: (s) => {
    set((st) => ({ sections: [...st.sections, s] }));
    upsertSectionRemote(s).then(() => get().syncSections()).catch(console.warn);
  },
  updateSection: (id, patch) => {
    const cur = get().sections.find((x) => x.id === id);
    if (!cur) return;
    const next = { ...cur, ...patch };
    set((st) => ({ sections: st.sections.map((x) => (x.id === id ? next : x)) }));
    upsertSectionRemote(next).then(() => get().syncSections()).catch(console.warn);
  },
  removeSection: (id) => {
    set((st) => ({ sections: st.sections.filter((x) => x.id !== id) }));
    deleteSectionRemote(id).then(() => { get().syncSections(); get().syncServices(); }).catch(console.warn);
  },

  // ───── Schedule ─────
  schedule: defaultSchedule,
  syncSchedule: async () => {
    try {
      const s = await fetchSchedule();
      if (Array.isArray(s) && s.length) set({ schedule: s });
    } catch (e) { console.warn('[syncSchedule]', e); }
  },
  setSchedule: (s) => {
    set({ schedule: s });
    saveScheduleRemote(s).catch(console.warn);
  },
  updateDaySchedule: (dayOfWeek, slots) => {
    const next = get().schedule.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, slots } : s));
    set({ schedule: next });
    saveScheduleRemote(next).catch(console.warn);
  },

  // ───── Blocked dates ─────
  blockedDates: [],
  syncBlockedDates: async () => {
    try { set({ blockedDates: await fetchBlockedDates() }); }
    catch (e) { console.warn('[syncBlockedDates]', e); }
  },
  addBlockedDate: (b) => {
    set((st) => ({ blockedDates: [...st.blockedDates, b] }));
    addBlockedDateRemote(b).catch(console.warn);
  },
  removeBlockedDate: (date) => {
    set((st) => ({ blockedDates: st.blockedDates.filter((b) => b.date !== date) }));
    removeBlockedDateRemote(date).catch(console.warn);
  },

  // ───── Appointments ─────
  appointments: [],
  appointmentsLoaded: false,
  appointmentsError: null,
  syncAppointments: async () => {
    try {
      const list = await fetchAppointments();
      set({ appointments: list, appointmentsLoaded: true, appointmentsError: null });
    } catch (err: any) {
      console.warn('[syncAppointments]', err?.message || err);
      set({ appointmentsError: err?.message || 'No se pudo sincronizar' });
    }
  },
  addAppointment: (appointment) => {
    set((s) => ({ appointments: [...s.appointments, appointment] }));
    createAppointmentRemote(appointment)
      .then(() => get().syncAppointments())
      .catch((err) => {
        console.error('[addAppointment]', err);
        set((s) => ({
          appointments: s.appointments.filter((a) => a.id !== appointment.id),
          appointmentsError: 'No se pudo guardar el turno en el servidor',
        }));
      });
  },
  removeAppointment: (id) => {
    const prev = get().appointments.find((a) => a.id === id);
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
    deleteAppointmentRemote(id)
      .then(() => get().syncAppointments())
      .catch((err) => {
        console.error('[removeAppointment]', err);
        if (prev) set((s) => ({ appointments: [...s.appointments, prev] }));
      });
  },
  updateAppointmentPayment: (id, updates) => {
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    updateAppointmentRemote(id, updates).then(() => get().syncAppointments()).catch(console.warn);
  },
  rescheduleAppointment: (id, patch) => {
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    updateAppointmentRemote(id, patch).then(() => get().syncAppointments()).catch(console.warn);
  },
  cleanupExpiredPending: () =>
    set((state) => {
      const now = new Date().toISOString();
      return {
        appointments: state.appointments.filter(
          (a) => a.paymentStatus !== 'pending' || !a.pendingExpiresAt || a.pendingExpiresAt > now
        ),
      };
    }),

  // ───── Auth ─────
  // Acepta una firma compatible: login(password) o login(_user, password)
  isAuthenticated: !!sessionStorage.getItem(TOKEN_KEY),
  adminUser: sessionStorage.getItem(TOKEN_KEY) ? { scope: 'admin' } : null,
  login: async (a, b) => {
    const password = b ?? a;
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) return false;
      const { token } = await res.json();
      sessionStorage.setItem(TOKEN_KEY, token);
      set({ isAuthenticated: true, adminUser: { scope: 'admin' } });
      return true;
    } catch (err) {
      console.warn('[login]', err);
      return false;
    }
  },
  logout: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    set({ isAuthenticated: false, adminUser: null });
  },
  initAuth: async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        sessionStorage.removeItem(TOKEN_KEY);
        set({ isAuthenticated: false, adminUser: null });
      }
    } catch {}
  },
}));

// Bootstrap: cargar catálogo + horarios + bloqueos al iniciar el app
if (typeof window !== 'undefined') {
  const s = useStore.getState();
  s.syncSections();
  s.syncServices();
  s.syncSpecialServices();
  s.syncSchedule();
  s.syncBlockedDates();
  s.initAuth();
}
