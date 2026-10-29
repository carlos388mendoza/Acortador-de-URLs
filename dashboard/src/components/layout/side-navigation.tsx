import { Plus, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  adminNavItems,
  developerNavItems,
  mainNavItems,
  profileNavItems,
  type NavItem,
} from "./nav-items";

type SideNavigationProps = {
  isAdmin: boolean;
  isMac: boolean;
  onNavigate?: () => void;
  onSearch: () => void;
  onCreateUrl: () => void;
};

export function SideNavigation({
  isAdmin,
  isMac,
  onNavigate,
  onSearch,
  onCreateUrl,
}: SideNavigationProps) {
  const renderItem = ({ to, label, icon: Icon, external }: NavItem) => {
    const classes =
      "flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted";
    if (external) {
      return (
        <a
          key={to}
          href={to}
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className={classes}
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
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
          `${classes} ${isActive ? "bg-accent text-accent-foreground hover:bg-accent" : ""}`
        }
      >
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </NavLink>
    );
  };

  return (
    <nav
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Navegación principal"
    >
      <Button
        className="mb-5 h-11 w-full justify-start rounded-xl"
        onClick={onCreateUrl}
      >
        <Plus className="size-4" />
        Nueva URL
      </Button>
      <div className="grid gap-1">
        {mainNavItems.slice(0, 1).map(renderItem)}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onSearch}
        className="mt-1 justify-start gap-3 rounded-xl px-3 text-foreground"
      >
        <Search className="size-4" />
        <span>Buscar</span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground">
          <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Button>
      <div className="grid gap-1">{mainNavItems.slice(1).map(renderItem)}</div>

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
      <div className="mt-auto grid gap-1 pt-5">
        {profileNavItems.map(renderItem)}
      </div>
    </nav>
  );
}
