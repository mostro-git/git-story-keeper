import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fuerza que la página se muestre siempre desde el inicio ante cualquier
 * cambio de ruta (navegación, apertura/cierre de servicio, back/forward).
 * También desactiva la restauración automática del navegador para que un
 * refresh (F5) inicie arriba de todo.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Si la URL apunta a un ancla (#servicios), respetarla.
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search, hash]);

  return null;
}
