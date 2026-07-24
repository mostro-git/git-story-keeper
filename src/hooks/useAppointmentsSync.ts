import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const POLL_INTERVAL_MS = 15_000;

/**
 * Sincroniza los turnos contra el backend.
 * - Carga inicial al montar
 * - Polling cada 15s mientras la pestaña esté visible
 * - Refresca inmediatamente al volver a enfocar la pestaña
 *
 * Llamalo una sola vez en la raíz de cada vista que muestra turnos
 * (Index para el formulario de reserva, AdminPanel para el panel).
 */
export function useAppointmentsSync() {
  const syncAppointments = useStore((s) => s.syncAppointments);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (!cancelled && document.visibilityState === 'visible') {
        syncAppointments();
      }
    };

    // Carga inicial
    syncAppointments();

    // Polling
    intervalId = setInterval(tick, POLL_INTERVAL_MS);

    // Refresco al volver a enfocar la pestaña
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncAppointments();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [syncAppointments]);
}
