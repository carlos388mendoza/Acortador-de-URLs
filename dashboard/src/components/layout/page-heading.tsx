import type { ReactNode } from "react";

export function PageHeading({
  label,
  title,
  subtitle,
  action,
}: {
  label: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          {label}
        </p>
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
