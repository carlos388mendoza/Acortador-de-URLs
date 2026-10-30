import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isLiveQuery,
  useLiveStatus,
  useNow,
  useOnline,
  useTabVisible,
} from "@/lib/live";

/** Fallos seguidos a partir de los cuales se muestra "Sin conexión". */
const OFFLINE_AFTER_FAILURES = 2;

/** "En vivo · actualizado hace X s", "Pausado" o "Sin conexión", con botón para actualizar ya. */
export function LiveIndicator() {
  const queryClient = useQueryClient();
  const { lastSuccess, failures } = useLiveStatus();
  const visible = useTabVisible();
  const online = useOnline();
  const now = useNow();
  const fetching = useIsFetching({ predicate: isLiveQuery }) > 0;

  const state = !visible
    ? "paused"
    : !online || failures >= OFFLINE_AFTER_FAILURES
      ? "offline"
      : "live";
  const seconds =
    lastSuccess === null
      ? null
      : Math.max(0, Math.round((now - lastSuccess) / 1000));
  const label =
    state === "paused"
      ? "Pausado"
      : state === "offline"
        ? "Sin conexión"
        : seconds === null
          ? "En vivo · conectando…"
          : `En vivo · actualizado hace ${seconds} s`;
  const dot =
    state === "live"
      ? "bg-green-500"
      : state === "offline"
        ? "bg-brand"
        : "bg-muted-foreground/60";

  return (
    <div className="flex items-center gap-1" data-live-state={state}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${state === "offline" ? "bg-active text-active-foreground" : "bg-muted text-muted-foreground"}`}
        title={
          state === "paused"
            ? "La actualización automática se pausa mientras la pestaña está oculta"
            : undefined
        }
      >
        <span className="relative flex size-2">
          {state === "live" && (
            <span className="absolute inline-flex size-full rounded-full bg-green-500 opacity-60 motion-safe:animate-ping" />
          )}
          <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
        </span>
        <span data-slot="live-label">{label}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 rounded-full text-muted-foreground"
        aria-label="Actualizar ahora"
        title="Actualizar ahora"
        disabled={fetching}
        onClick={() =>
          void queryClient.refetchQueries({
            type: "active",
            predicate: isLiveQuery,
          })
        }
      >
        <RefreshCw
          className={`size-3.5 ${fetching ? "motion-safe:animate-spin" : ""}`}
        />
      </Button>
    </div>
  );
}
