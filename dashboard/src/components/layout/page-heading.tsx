import type { ReactNode } from "react";
import { LiveIndicator } from "@/components/shared/live-indicator";

export function PageHeading({
  label,
  title,
  subtitle,
  action,
  live = false,
}: {
  label: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  /** Muestra el indicador "En vivo" junto al título (páginas que se actualizan solas). */
  live?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          {label}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {title}
          </h1>
          {live && <LiveIndicator />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
