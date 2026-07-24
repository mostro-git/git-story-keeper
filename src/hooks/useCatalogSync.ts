import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

const POLL_INTERVAL_MS = 10_000;

/**
 * Sincroniza catálogo (servicios, servicios especiales, horarios, días bloqueados)
 * contra el backend. Pensado para correr una vez en la raíz del panel admin y
 * también en el flujo público para que los cambios se vean en tiempo casi-real
 * entre dispositivos.
 */
export function useCatalogSync() {
  const syncSections = useStore((s) => s.syncSections);
  const syncServices = useStore((s) => s.syncServices);
  const syncSpecialServices = useStore((s) => s.syncSpecialServices);
  const syncSpecialCategories = useStore((s) => s.syncSpecialCategories);
  const syncPromotions = useStore((s) => s.syncPromotions);
  const syncUniqueServices = useStore((s) => s.syncUniqueServices);
  const syncSchedule = useStore((s) => s.syncSchedule);
  const syncBlockedDates = useStore((s) => s.syncBlockedDates);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const syncAll = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      syncSections?.();
      syncServices?.();
      syncSpecialServices?.();
      syncSpecialCategories?.();
      syncPromotions?.();
      syncUniqueServices?.();
      syncSchedule?.();
      syncBlockedDates?.();
    };

    syncAll();
    intervalId = setInterval(syncAll, POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncAll();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [syncSections, syncServices, syncSpecialServices, syncSpecialCategories, syncPromotions, syncUniqueServices, syncSchedule, syncBlockedDates]);
}
