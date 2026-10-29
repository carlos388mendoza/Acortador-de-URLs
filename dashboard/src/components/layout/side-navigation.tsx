import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/api/client";
import type { Summary } from "@/types";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  adminNavItems,
  developerNavItems,
  mainNavItems,
  type NavItem,
} from "./nav-items";

type SideNavigationProps = {
  isAdmin: boolean;
  onNavigate?: () => void;
  onCreateUrl: () => void;
};

export function SideNavigation({
  isAdmin,
  onNavigate,
  onCreateUrl,
}: SideNavigationProps) {
  const summary = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => api<Summary>("/api/admin/stats/summary"),
  });
  const counts: Record<string, number | undefined> = {
    URLs: summary.data?.total_urls,
    "API keys": summary.data?.active_api_keys,
    Usuarios: summary.data?.total_users,
  };
  const renderItem = ({ to, label, icon: Icon, external }: NavItem) => {
    const classes =
      "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted";
    const count = counts[label];
    if (external) {
      return (
        <a
          key={to}
          href={to}
          target="_blank"
          rel="noreferrer"
          title={
            to === "/api/reference"
              ? "Documentación interactiva para probar la API"
              : undefined
          }
          onClick={onNavigate}
          className={classes}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
          {count !== undefined && count > 0 && <CountBadge value={count} />}
        </a>
      );
    }
    return (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        onClick={onNavigate}
        className={({ isActive }) =>
          `${classes} ${isActive ? "bg-accent text-accent-foreground hover:bg-accent [&_svg]:text-accent-foreground" : ""}`
        }
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
        {count !== undefined && count > 0 && <CountBadge value={count} />}
      </NavLink>
    );
  };

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Navegación principal"
    >
      <Button
        className="mb-5 h-11 w-full shrink-0 justify-start rounded-xl bg-[#1c1917] text-white hover:bg-stone-800"
        onClick={onCreateUrl}
      >
        <Plus className="size-4" />
        Nueva URL
      </Button>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          General
        </p>
        <div className="grid gap-1">{mainNavItems.map(renderItem)}</div>

        <p className="mb-2 mt-7 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Desarrolladores
        </p>
        <div className="grid gap-1">{developerNavItems.map(renderItem)}</div>

        {isAdmin && (
          <>
            <p className="mb-2 mt-7 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Administración
            </p>
            <div className="grid gap-1">{adminNavItems.map(renderItem)}</div>
          </>
        )}
      </div>
    </nav>
  );
}

function CountBadge({ value }: { value: number }) {
  return (
    <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
      {value}
    </span>
  );
}
