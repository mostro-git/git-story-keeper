/**
 * Utilidades de manejo de precio en pesos argentinos.
 * - Se almacenan siempre como número entero (sin decimales).
 * - Se aceptan entradas con o sin separadores de miles ("30000", "30.000", "30,000").
 * - Se muestran con formato es-AR: "$30.000".
 */

/**
 * Convierte cualquier entrada de usuario a un entero. Ignora separadores
 * de miles y cualquier carácter no numérico. Devuelve 0 si no hay dígitos.
 */
export function parsePrice(input: string | number | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? Math.trunc(input) : 0;
  const digits = String(input).replace(/\D/g, '');
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Formatea un precio entero al formato de Argentina: "$30.000".
 */
export function formatPriceARS(value: number | null | undefined): string {
  const n = parsePrice(value);
  return `$${n.toLocaleString('es-AR')}`;
}
