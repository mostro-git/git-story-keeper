
export interface Section {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  position?: number;
}
export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes (30, 60, 90, etc.)
  price: number;
  imageUrl?: string;
  availableDays?: number[]; // 0-6 (Sunday-Saturday), empty = all days
  sectionId?: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  createdAt: string;
  // Payment (deposit / seña)
  paymentStatus?: PaymentStatus; // pending until webhook confirms
  depositAmount?: number; // monto de la seña (50% del precio del servicio)
  servicePrice?: number; // precio total del servicio al momento de reservar
  paymentId?: string; // ID de pago de Mercado Pago
  preferenceId?: string; // ID de preferencia de MP
  pendingExpiresAt?: string; // ISO — si paymentStatus === 'pending', expira y se libera
  kind?: 'service' | 'special'; // distingue turnos regulares de especiales (pueden coexistir en el mismo slot)
}

export interface AvailableSlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  date?: string; // For specific dates
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  enabled: boolean;
}

export interface Schedule {
  id: string;
  dayOfWeek: number;
  slots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  enabled: boolean;
}

export interface BlockedDate {
  date: string;
  reason?: string;
}

export interface SpecialService {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
  date?: string; // YYYY-MM-DD - optional; if set, blocks regular services that day
  categoryId?: string;
  position?: number;
}

export interface SpecialCategory {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  position?: number;
}

/**
 * Promotion: bloque promocional simple que redirige a WhatsApp.
 * Solo requiere título, descripción y un teléfono opcional (si está vacío
 * se usa el número por defecto de la estética).
 */
export interface Promotion {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  phone?: string; // formato wa.me: solo dígitos con código país
  position?: number;
}

/**
 * UniqueService: servicio "único" — no toma turnos online; en la página
 * principal renderiza un botón que abre WhatsApp con un mensaje pre-llenado.
 * Si `phone` está vacío, se usa el número por defecto de la estética (Footer).
 */
export interface UniqueService {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  phone?: string; // formato wa.me: solo dígitos con código país
  position?: number;
}
