import { Home, KeyRound, Link2, Settings, Users } from "lucide-react";

export const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/urls", label: "URLs", icon: Link2 },
  { to: "/api-keys", label: "API keys", icon: KeyRound },
  { to: "/users", label: "Personas", icon: Users },
  { to: "/profile", label: "Mi perfil", icon: Settings },
];

export function getVisibleNavItems(isAdmin: boolean) {
  return navItems.filter((item) => item.to !== "/users" || isAdmin);
}
