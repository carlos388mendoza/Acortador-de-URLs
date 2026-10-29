import {
  BookOpen,
  House,
  KeyRound,
  QrCode,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  subtitle: "Página" | "Desarrolladores" | "Administración";
  external?: boolean;
};

export const mainNavItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: House, subtitle: "Página" },
  { to: "/urls", label: "URLs", icon: QrCode, subtitle: "Página" },
];

export const developerNavItems: NavItem[] = [
  {
    to: "/api-keys",
    label: "API keys",
    icon: KeyRound,
    subtitle: "Desarrolladores",
  },
  {
    to: "/api/reference",
    label: "Documentación API",
    icon: BookOpen,
    subtitle: "Desarrolladores",
    external: true,
  },
  {
    to: "/skill",
    label: "SKILL",
    icon: Sparkles,
    subtitle: "Desarrolladores",
    external: false,
  },
];

export const adminNavItems: NavItem[] = [
  {
    to: "/admin",
    label: "Administración",
    icon: ShieldCheck,
    subtitle: "Administración",
  },
  { to: "/users", label: "Usuarios", icon: Users, subtitle: "Administración" },
];

export const profileNavItems: NavItem[] = [
  { to: "/profile", label: "Mi perfil", icon: UserRound, subtitle: "Página" },
];

export function getVisibleNavItems(isAdmin: boolean) {
  return [
    ...mainNavItems,
    ...developerNavItems,
    ...(isAdmin ? adminNavItems : []),
    ...profileNavItems,
  ];
}
