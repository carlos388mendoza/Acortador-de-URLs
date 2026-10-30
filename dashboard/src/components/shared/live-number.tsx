import { useChangeCount } from "@/lib/live";

/**
 * Número que destella en rojo claro durante 1 s cada vez que cambia por una actualización automática.
 * La `key` cambia con cada valor nuevo para reiniciar la animación. Sin animación si el sistema pide
 * movimiento reducido (ver `.live-flash` en index.css).
 */
export function LiveNumber({ value }: { value: number }) {
  const changes = useChangeCount(value);
  return (
    <span
      key={changes}
      className={changes > 0 ? "live-flash -mx-0.5 px-0.5" : undefined}
      data-live-flash={changes > 0 ? "" : undefined}
    >
      {value}
    </span>
  );
}
