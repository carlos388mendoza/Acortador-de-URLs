import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeading({
  label,
  title,
  subtitle,
  action,
  icon: Icon,
}: {
  label: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
          {label}
        </p>
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold sm:text-4xl">
          {Icon && <Icon className="size-7 text-brand" />}
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
