import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import type { AdminUrl, ApiUserResponse, Page } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "./command-palette";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { useKeyboardShortcuts } from "./keyboard-shortcuts";
import { SideNavigation } from "./side-navigation";
import { ThemeControl } from "./theme-control";

export function AppLayout() {
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchMatches, setSearchMatches] = useState<AdminUrl[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const isAdmin = data?.user.role === "admin";
  const titleByPath: Record<string, string> = {
    "/": "Inicio",
    "/urls": "URLs",
    "/api-keys": "API keys",
    "/users": "Personas",
    "/profile": "Mi perfil",
  };
  const title = titleByPath[location.pathname] ?? "No encontrado";
  const initials =
    data?.user.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AU";

  const navigateTo = useCallback((path: string) => navigate(path), [navigate]);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeDialogs = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setLogoutOpen(false);
  }, []);

  useKeyboardShortcuts({
    navigate,
    openPalette,
    openHelp,
    closeDialogs,
  });

  useEffect(() => {
    document.title = `${title} | Acortador`;
  }, [title]);

  useEffect(() => {
    const term = search.trim();
    const timer = window.setTimeout(
      () => {
        if (!term) {
          setSearchMatches([]);
          return;
        }

        void api<Page<AdminUrl>>(
          `/api/admin/urls?page=1&limit=10&search=${encodeURIComponent(term)}`,
        )
          .then((result) => setSearchMatches(result.data))
          .catch(() => setSearchMatches([]));
      },
      term ? 250 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [search]);

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      queryClient.removeQueries({ queryKey: ["me"] });
      setLogoutOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo cerrar sesión",
      );
    }
  };

  const openProfile = () => navigateTo("/profile");
  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir opciones de cuenta"
          className="md:hidden"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={openProfile}>Mi perfil</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            document
              .querySelector<HTMLButtonElement>('[aria-label="Cambiar tema"]')
              ?.click()
          }
        >
          Cambiar tema
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-background p-5 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-3 font-semibold">
          <img
            src="/dashboard/logo.png"
            alt=""
            className="size-10 rounded-full"
          />
          <span>Acortador</span>
        </Link>
        <SideNavigation isAdmin={isAdmin} />
        <div className="mt-auto space-y-4">
          <ThemeControl />
          <div className="flex items-center gap-2 border-t pt-4">
            <Avatar className="size-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {data?.user.name ?? "Cuenta"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {data?.user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img
                    src="/dashboard/logo.png"
                    alt=""
                    className="size-8 rounded-full"
                  />
                  Acortador
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <SideNavigation
                  isAdmin={isAdmin}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">
            {title}
          </h1>
          <div className="relative hidden w-full max-w-sm sm:block">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar URLs..."
              aria-label="Buscar URLs"
              className="pl-9"
            />
            {search && (
              <div className="absolute top-11 z-30 max-h-64 w-full overflow-auto rounded-lg border bg-popover p-2 shadow-lg">
                {searchMatches.length ? (
                  searchMatches.map((url) => (
                    <button
                      key={url.id}
                      className="block w-full truncate rounded p-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        navigate(
                          `/urls?search=${encodeURIComponent(url.code)}`,
                        );
                        setSearch("");
                      }}
                    >
                      {url.code} · {url.url}
                    </button>
                  ))
                ) : (
                  <p className="p-2 text-sm text-muted-foreground">
                    No se encontraron URLs.
                  </p>
                )}
              </div>
            )}
          </div>
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            isMac={isMac}
            isAdmin={isAdmin}
            onNavigate={navigateTo}
            onRequestLogout={() => setLogoutOpen(true)}
          />
          {userMenu}
        </header>

        <main className="mx-auto min-w-0 max-w-7xl p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => void logout()}
      />
      <KeyboardShortcutsDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        isMac={isMac}
      />
      <Toaster richColors position="top-right" />
    </div>
  );
}
