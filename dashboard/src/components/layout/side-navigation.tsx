import { NavLink } from "react-router-dom";
import { getVisibleNavItems } from "./nav-items";

type SideNavigationProps = {
  isAdmin: boolean;
  onNavigate?: () => void;
};

export function SideNavigation({ isAdmin, onNavigate }: SideNavigationProps) {
  return (
    <nav className="grid gap-1" aria-label="Navegación principal">
      {getVisibleNavItems(isAdmin).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
