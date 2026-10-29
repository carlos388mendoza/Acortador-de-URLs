import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  House,
  LogOut,
  Menu,
  Plus,
  QrCode,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import type { ApiUserResponse } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { AccountPanel } from "./account-panel";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { useKeyboardShortcuts } from "./keyboard-shortcuts";
import { SideNavigation } from "./side-navigation";
import { ThemeControl } from "./theme-control";
import { Kbd } from "@/components/ui/kbd";

const CommandPalette = lazy(() =>
  import("./command-palette").then((module) => ({
    default: module.CommandPalette,
  })),
);

type OpenLayer = "menu" | "palette" | "account" | "help" | "logout" | null;

export function AppLayout() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  // Este único estado impide que menú, paleta y cuenta se tapen entre sí.
  const [openLayer, setOpenLayer] = useState<OpenLayer>(null);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const isAdmin = data?.user.role === "admin";
  const titleByPath: Record<string, string> = {
    "/": "Inicio",
    "/urls": "URLs",
    "/api-keys": "API keys",
    "/users": "Usuarios",
    "/admin": "Administración",
    "/profile": "Mi perfil",
    "/skill": "SKILL",
  };
  const title = titleByPath[location.pathname] ?? "No encontrado";
  const initials =
    data?.user.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AU";

  const openPalette = useCallback(() => setOpenLayer("palette"), []);
  const togglePalette = useCallback(
    () => setOpenLayer((current) => (current === "palette" ? null : "palette")),
    [],
  );
  const openHelp = useCallback(() => setOpenLayer("help"), []);
  const closeDialogs = useCallback(() => setOpenLayer(null), []);
  const requestLogout = useCallback(() => {
    setOpenLayer(null);
    // Deja terminar el cierre del panel o la paleta antes de mostrar el diálogo.
    window.setTimeout(() => setOpenLayer("logout"), 250);
  }, []);

  useEffect(() => {
    document.title = `${title} | Acortador de URLs`;
  }, [title]);

  useEffect(() => {
    const onRequestLogout = () => requestLogout();
    window.addEventListener("request-logout", onRequestLogout);
    return () => window.removeEventListener("request-logout", onRequestLogout);
  }, [requestLogout]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayout = (event: MediaQueryListEvent) =>
      setIsDesktop(event.matches);
    desktopQuery.addEventListener("change", updateLayout);
    return () => desktopQuery.removeEventListener("change", updateLayout);
  }, []);

  const createUrl = () => {
    setOpenLayer(null);
    if (location.pathname === "/urls") {
      window.dispatchEvent(new Event("new-url"));
      return;
    }
    navigate("/urls", { state: { openNewUrl: true } });
  };

  const createKey = () => {
    setOpenLayer(null);
    if (location.pathname === "/api-keys") {
      window.dispatchEvent(new Event("new-api-key"));
      return;
    }
    navigate("/api-keys", { state: { openNewApiKey: true } });
  };

  useKeyboardShortcuts({
    navigate,
    openPalette: togglePalette,
    openHelp,
    closeDialogs,
    onCreateUrl: createUrl,
  });

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      queryClient.removeQueries({ queryKey: ["me"] });
      setOpenLayer(null);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cerrar sesión",
      );
      throw error;
    }
  };

  const goToProfile = () => {
    setOpenLayer(null);
    navigate("/profile");
  };
  const sidebarProps = {
    isAdmin: Boolean(isAdmin),
    onNavigate: () => setOpenLayer(null),
    onCreateUrl: createUrl,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] min-h-0 flex-col border-r border-border bg-white px-4 py-5 lg:flex dark:bg-sidebar">
        <Link
          to="/"
          className="mb-4 flex shrink-0 items-center gap-3 px-2 font-bold"
        >
          <img
            src="/dashboard/logo.png"
            alt=""
            className="size-10 rounded-full object-cover"
          />
          <span className="min-w-0">
            <span className="block font-heading text-base leading-tight">
              Acortador de URLs
            </span>
            <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
              Grupo Comidas · Sistemas
            </span>
          </span>
        </Link>
        <div className="mb-4 h-px shrink-0 bg-border" />
        <SideNavigation {...sidebarProps} />
        <div className="mt-4 shrink-0 border-t border-border pt-3">
          <DropdownMenu
            open={openLayer === "account" && isDesktop}
            onOpenChange={(open) =>
              setOpenLayer((current) =>
                open ? "account" : current === "account" ? null : current,
              )
            }
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start gap-3 rounded-xl p-2"
                aria-label="Abrir menú de cuenta"
              >
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-bold">
                    {data?.user.name ?? "Cuenta"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {data?.user.email} · {data?.user.role}
                  </span>
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-[300px] rounded-2xl p-0"
            >
              <AccountPanel
                user={data?.user}
                onProfile={goToProfile}
                onLogout={requestLogout}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="mt-2 grid gap-2">
            <p className="px-1 text-xs font-semibold text-muted-foreground">
              Tema
            </p>
            <ThemeControl />
          </div>
          <Button
            variant="outline"
            className="mt-2 w-full rounded-xl"
            onClick={requestLogout}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[264px]">
        <header className="fixed inset-x-0 top-0 z-20 flex h-16 min-w-0 items-center gap-3 border-b border-border bg-sidebar/95 px-4 backdrop-blur lg:left-[264px] lg:px-8">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menú lateral"
            onClick={() => setOpenLayer("menu")}
          >
            <Menu className="size-5" />
          </Button>
          <Link to="/" className="flex shrink-0 items-center gap-2 lg:hidden">
            <img
              src="/dashboard/logo.png"
              alt=""
              className="size-8 rounded-full"
            />
            <span className="font-heading text-sm font-bold">
              Acortador de URLs
            </span>
          </Link>
          <Button
            type="button"
            variant="outline"
            className="ml-auto h-10 justify-start gap-2 rounded-xl text-muted-foreground lg:hidden"
            onClick={openPalette}
            aria-label="Buscar en el dashboard"
          >
            <Search className="size-4" />
            <span className="hidden min-[380px]:inline">Buscar</span>
          </Button>
          <div className="hidden flex-1 justify-center lg:flex">
            <Button
              variant="outline"
              onClick={openPalette}
              className="h-11 w-full max-w-[440px] justify-start rounded-full px-4 text-muted-foreground"
            >
              <Search className="size-4" /> Buscar...
              <span className="ml-auto">
                <Kbd>{isMac ? "⌘ K" : "Ctrl K"}</Kbd>
              </span>
            </Button>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1500px] px-4 pb-28 pt-20 sm:px-6 lg:px-8 lg:pb-10 lg:pt-24">
          <Outlet />
        </main>
      </div>

      <Sheet
        open={openLayer === "menu" && !isDesktop}
        onOpenChange={(open) =>
          setOpenLayer((current) =>
            open ? "menu" : current === "menu" ? null : current,
          )
        }
      >
        <SheetContent
          side="left"
          className="flex w-[min(88vw,320px)] min-h-0 flex-col border-r border-border bg-white p-4 dark:bg-sidebar"
          aria-label="Menú lateral"
        >
          <SheetHeader className="mb-4 shrink-0 border-b border-border pb-4">
            <SheetTitle className="flex items-center gap-3 font-heading text-lg">
              <img
                src="/dashboard/logo.png"
                alt=""
                className="size-9 rounded-full"
              />
              <span className="text-left">
                <span className="block">Acortador de URLs</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Grupo Comidas · Sistemas
                </span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <SideNavigation {...sidebarProps} />
          <div className="mt-4 shrink-0 border-t border-border pt-3">
            <div className="mb-2 flex min-w-0 items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {data?.user.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {data?.user.email} · {data?.user.role}
                </span>
              </span>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={goToProfile}
            >
              Mi perfil
            </Button>
            <p className="mb-2 mt-2 text-xs font-semibold text-muted-foreground">
              Tema
            </p>
            <ThemeControl />
            <Button
              variant="outline"
              className="mt-2 w-full rounded-xl"
              onClick={requestLogout}
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={openLayer === "account" && !isDesktop}
        onOpenChange={(open) =>
          setOpenLayer((current) =>
            open ? "account" : current === "account" ? null : current,
          )
        }
      >
        <SheetContent
          side="bottom"
          className="!left-1/2 !right-auto !w-[min(calc(100vw-1rem),420px)] !-translate-x-1/2 max-h-[85dvh] !rounded-t-3xl p-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Cuenta"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Cuenta</SheetTitle>
          </SheetHeader>
          <div
            className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30"
            aria-hidden="true"
          />
          <AccountPanel
            user={data?.user}
            onProfile={goToProfile}
            onLogout={requestLogout}
          />
        </SheetContent>
      </Sheet>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_20px_rgb(28_25_23/6%)] backdrop-blur lg:hidden"
        aria-label="Navegación móvil"
      >
        <MobileNavItem to="/" label="Inicio" icon={House} />
        <button
          type="button"
          onClick={openPalette}
          className="grid h-12 place-content-center place-items-center gap-0.5 rounded-xl text-xs text-muted-foreground"
          aria-label="Buscar"
        >
          <Search className="size-5" />
          Buscar
        </button>
        <button
          type="button"
          onClick={createUrl}
          className="group grid h-12 place-items-center"
          aria-label="Nueva URL"
        >
          {/* La celda mide lo mismo que las demás (h-12); el círculo de 44px queda dentro de la barra */}
          <span className="grid size-11 place-content-center place-items-center gap-0.5 rounded-full bg-primary text-primary-foreground shadow-sm group-hover:bg-primary/90">
            <Plus className="size-5" />
            <span className="text-[10px] font-semibold leading-none">
              Nuevo
            </span>
          </span>
        </button>
        <MobileNavItem to="/urls" label="URLs" icon={QrCode} />
        <button
          type="button"
          onClick={() => setOpenLayer("account")}
          className={`grid h-12 place-content-center place-items-center gap-0.5 rounded-xl text-xs ${openLayer === "account" ? "bg-active text-active-foreground" : "text-muted-foreground"}`}
          aria-label="Cuenta"
        >
          <UserRound className="size-5" />
          Cuenta
        </button>
      </nav>

      {openLayer === "palette" && (
        <Suspense fallback={null}>
          <CommandPalette
            open={openLayer === "palette"}
            onOpenChange={(open) =>
              setOpenLayer((current) =>
                open ? "palette" : current === "palette" ? null : current,
              )
            }
            isMac={isMac}
            isAdmin={Boolean(isAdmin)}
            onNavigate={navigate}
            onRequestLogout={requestLogout}
            onCreateUrl={createUrl}
            onCreateKey={createKey}
          />
        </Suspense>
      )}
      <LogoutConfirmDialog
        open={openLayer === "logout"}
        onOpenChange={(open) => setOpenLayer(open ? "logout" : null)}
        onConfirm={logout}
      />
      <KeyboardShortcutsDialog
        open={openLayer === "help"}
        onOpenChange={(open) => setOpenLayer(open ? "help" : null)}
        isMac={isMac}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: typeof House;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `grid h-12 place-content-center place-items-center gap-0.5 rounded-xl text-xs ${isActive ? "bg-active text-active-foreground" : "text-muted-foreground"}`
      }
    >
      <Icon className="size-5" />
      {label}
    </NavLink>
  );
}
