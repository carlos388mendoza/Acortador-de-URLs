import { useEffect, useState, useSyncExternalStore } from "react";
import {
  keepPreviousData,
  type QueryMeta,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { mocksEnabled } from "@/api/client";

/**
 * Actualización "en vivo" por consultas periódicas.
 * El backend corre en funciones sin servidor de Vercel, así que no hay WebSockets: cada página vuelve a
 * pedir sus datos cada pocos segundos. TanStack Query pausa esos ciclos cuando la pestaña está oculta y
 * vuelve a consultar en cuanto se muestra o se recupera la conexión.
 */
export const LIVE_INTERVALS = {
  home: 10_000,
  lists: 15_000,
  sidebar: 15_000,
} as const;

// Solo con datos simulados: las pruebas acortan los ciclos guardando un valor en localStorage
function testInterval(): number | null {
  if (!mocksEnabled) return null;
  try {
    const value = Number(localStorage.getItem("au-live-interval-ms"));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Opciones para una consulta que se actualiza sola cada `interval` milisegundos. */
export function liveQuery(interval: number) {
  return {
    refetchInterval: testInterval() ?? interval,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Mientras llega la respuesta nueva se siguen viendo los datos anteriores (sin skeletons ni saltos)
    placeholderData: keepPreviousData,
    meta: { live: true },
  };
}

/** Para consultas que se leen en vivo pero cuyo ciclo ya lo lleva otro componente (sin pedir de más). */
export const liveRead = { refetchOnWindowFocus: true, meta: { live: true } };

export const isLiveQuery = (query: { meta?: QueryMeta }) =>
  query.meta?.live === true;

// ---------- Estado del indicador "En vivo" ----------

type LiveState = { lastSuccess: number | null; failures: number };
let liveState: LiveState = { lastSuccess: null, failures: 0 };
const liveListeners = new Set<() => void>();
const emit = () => liveListeners.forEach((listener) => listener());

/** Lo alimenta el QueryCache (main.tsx) con el resultado de cada consulta en vivo. */
export const liveStatus = {
  success() {
    liveState = { lastSuccess: Date.now(), failures: 0 };
    emit();
  },
  failure() {
    liveState = { ...liveState, failures: liveState.failures + 1 };
    emit();
  },
  subscribe(listener: () => void) {
    liveListeners.add(listener);
    return () => liveListeners.delete(listener);
  },
  get: () => liveState,
};

export const useLiveStatus = () =>
  useSyncExternalStore(liveStatus.subscribe, liveStatus.get);

function subscribeToEvents(target: EventTarget, events: string[]) {
  return (listener: () => void) => {
    events.forEach((name) => target.addEventListener(name, listener));
    return () =>
      events.forEach((name) => target.removeEventListener(name, listener));
  };
}
const subscribeVisibility = subscribeToEvents(document, ["visibilitychange"]);
const subscribeOnline = subscribeToEvents(window, ["online", "offline"]);

export const useTabVisible = () =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
  );
export const useOnline = () =>
  useSyncExternalStore(subscribeOnline, () => navigator.onLine);

/** Hora actual que se renueva cada segundo (para "actualizado hace X s"). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

// ---------- Cambios visibles ----------

/**
 * Devuelve un número que sube cada vez que `value` cambia (no en el primer render).
 * Usado como `key` reinicia la animación de destello del elemento.
 */
export function useChangeCount<T>(value: T) {
  const [state, setState] = useState({ value, count: 0 });
  if (!Object.is(state.value, value))
    setState({ value, count: state.count + 1 });
  return state.count;
}

/**
 * Ids que aparecieron después de la primera carga (para animar su entrada).
 * Al cambiar `scope` (página, búsqueda...) se empieza de cero: no se animan resultados de otra página.
 */
export function useNewIds(
  ids: readonly (number | string)[] | undefined,
  scope = "",
) {
  const signature = ids ? `${scope}::${ids.join("|")}` : null;
  const [state, setState] = useState<{
    signature: string | null;
    scope: string;
    seen: ReadonlySet<number | string> | null;
    fresh: ReadonlySet<number | string>;
  }>({ signature: null, scope, seen: null, fresh: new Set() });

  if (ids && signature !== state.signature) {
    const known = state.scope === scope ? state.seen : null;
    const fresh = new Set<number | string>();
    const seen = new Set(known ?? []);
    for (const id of ids) {
      if (known && !known.has(id)) fresh.add(id);
      seen.add(id);
    }
    setState({ signature, scope, seen, fresh });
  }
  return state.fresh;
}

// ---------- Sincronización entre pestañas ----------

type SyncMessage = { from: string; keys: QueryKey[] };
const SYNC_CHANNEL = "acortador-dashboard";
const SYNC_STORAGE_KEY = "au-sync";
const tabId =
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : String(Math.random()).slice(2);
const channel =
  typeof BroadcastChannel === "function"
    ? new BroadcastChannel(SYNC_CHANNEL)
    : null;

/**
 * Actualiza esta pestaña y avisa a las demás del mismo navegador.
 * Se usa después de crear, editar o borrar algo.
 */
export function refreshEverywhere(queryClient: QueryClient, keys: QueryKey[]) {
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
  const message: SyncMessage = { from: tabId, keys };
  if (channel) {
    channel.postMessage(message);
    return;
  }
  // Respaldo sin BroadcastChannel: el evento "storage" llega a las otras pestañas
  try {
    localStorage.setItem(
      SYNC_STORAGE_KEY,
      JSON.stringify({ ...message, at: Date.now() }),
    );
  } catch {
    /* almacenamiento bloqueado: las otras pestañas se actualizarán en su ciclo */
  }
}

/** Escucha los avisos de otras pestañas y vuelve a pedir lo que cambió. */
export function useLiveSync(queryClient: QueryClient) {
  useEffect(() => {
    const apply = (message: unknown) => {
      const data = message as Partial<SyncMessage> | null;
      if (!data || data.from === tabId || !Array.isArray(data.keys)) return;
      for (const queryKey of data.keys)
        void queryClient.invalidateQueries({ queryKey });
    };
    const onMessage = (event: MessageEvent) => apply(event.data);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SYNC_STORAGE_KEY || !event.newValue) return;
      try {
        apply(JSON.parse(event.newValue));
      } catch {
        /* mensaje ilegible: se ignora */
      }
    };
    channel?.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [queryClient]);
}
