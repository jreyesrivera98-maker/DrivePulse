import { useRef } from "react";

/**
 * Devuelve un nombre de canal único por cada vez que se MONTA el
 * hook que lo usa (estable entre renders del mismo montaje, gracias
 * a useRef).
 *
 * Por qué existe: varios componentes pueden usar el mismo hook de
 * datos (p. ej. useVehicles) al mismo tiempo — el Panel de Flotilla y
 * el Dashboard, por ejemplo. Si ambos abrieran un canal de Realtime
 * con el mismo nombre literal ("vehicles-realtime"), Supabase JS
 * reutiliza el canal ya suscrito y truena con:
 *   "cannot add `postgres_changes` callbacks ... after `subscribe()`"
 * porque el segundo hook intenta registrar su propio '.on(...)' sobre
 * un canal que el primero ya suscribió. Cada instancia necesita su
 * propio nombre de canal, aunque escuchen la misma tabla.
 */
export function useUniqueChannelName(base) {
  const idRef = useRef(`${base}-${Math.random().toString(36).slice(2)}-${Date.now()}`);
  return idRef.current;
}
