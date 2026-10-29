import { useEffect, useState } from "react";
import {
  BookOpen,
  House,
  KeyRound,
  QrCode,
  LogOut,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Monitor,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/api/client";
import type { AdminUrl, ApiKey, User } from "@/types";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDashboardTheme, type Theme } from "./theme-provider";

type SearchResults = {
  urls: AdminUrl[];
  users: User[];
  api_keys: ApiKey[];
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMac: boolean;
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  onRequestLogout: () => void;
  onCreateUrl: () => void;
  onCreateKey: () => void;
};

const emptyResults: SearchResults = { urls: [], users: [], api_keys: [] };
const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

/** Mantiene búsqueda, navegación y acciones en un solo punto accesible. */
export function CommandPalette({
  open,
  onOpenChange,
  isMac,
  isAdmin,
  onNavigate,
  onRequestLogout,
  onCreateUrl,
  onCreateKey,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const { theme, setTheme } = useDashboardTheme();

  useEffect(() => {
    const term = search.trim();
    const timer = window.setTimeout(() => {
      if (!term) {
        setResults(emptyResults);
        return;
      }

      // Espera a que el usuario termine de escribir antes de consultar la API.
      void api<SearchResults>("/api/admin/search?q=" + encodeURIComponent(term))
        .then(setResults)
        .catch(() => setResults(emptyResults));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const navigate = (path: string) => {
    onNavigate(path);
    onOpenChange(false);
  };
  const openExternal = (path: string) => {
    window.open(path, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar en el dashboard"
      description="Navega, busca registros y ejecuta acciones"
      className="top-2 h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] translate-y-0 rounded-2xl p-2 sm:top-1/2 sm:h-auto sm:max-h-[min(82vh,720px)] sm:max-w-2xl sm:-translate-y-1/2"
    >
      <Command shouldFilter>
        <div className="px-3 pb-2 pt-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted px-3">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder="Busca URLs, usuarios, keys o acciones..."
              value={search}
              onValueChange={setSearch}
              className="h-11 border-0 text-base shadow-none focus-visible:ring-0"
            />
            <Kbd className="shrink-0">Esc</Kbd>
          </div>
          <div className="mt-3 h-px bg-border" />
        </div>
        <CommandList className="max-h-none flex-1 px-1 pb-2 sm:max-h-[min(60vh,560px)]">
          <CommandEmpty>No encontramos coincidencias.</CommandEmpty>
          <CommandGroup heading="Acciones">
            <CommandItem value="Nueva URL crear enlace" onSelect={onCreateUrl}>
              <Plus />
              <span>Nueva URL</span>
              <span className="ml-auto text-xs text-muted-foreground">
                Acción
              </span>
            </CommandItem>
            <CommandItem
              value="Nueva API key crear llave"
              onSelect={onCreateKey}
            >
              <KeyRound />
              <span>Nueva API key</span>
              <span className="ml-auto text-xs text-muted-foreground">
                Acción
              </span>
            </CommandItem>
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <CommandItem
                key={value}
                value={`Tema ${label}`}
                onSelect={() => setTheme(value)}
              >
                <Icon />
                <span className="flex flex-col">
                  <span>Tema: {label}</span>
                  {theme === value && (
                    <span className="text-xs text-muted-foreground">
                      Actual
                    </span>
                  )}
                </span>
              </CommandItem>
            ))}
            <CommandItem value="Cerrar sesión salir" onSelect={onRequestLogout}>
              <LogOut />
              <span>Cerrar sesión</span>
              <span className="ml-auto text-xs text-muted-foreground">
                Acción
              </span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Ir a">
            <PaletteLink
              icon={House}
              label="Inicio"
              subtitle="Página"
              onSelect={() => navigate("/")}
            />
            <PaletteLink
              icon={QrCode}
              label="URLs"
              subtitle="Página"
              onSelect={() => navigate("/urls")}
            />
            <PaletteLink
              icon={KeyRound}
              label="API keys"
              subtitle="Desarrolladores"
              onSelect={() => navigate("/api-keys")}
            />
            {isAdmin && (
              <>
                <PaletteLink
                  icon={Users}
                  label="Usuarios"
                  subtitle="Administración"
                  onSelect={() => navigate("/users")}
                />
                <PaletteLink
                  icon={ShieldCheck}
                  label="Administración"
                  subtitle="Administración"
                  onSelect={() => navigate("/admin")}
                />
              </>
            )}
            <PaletteLink
              icon={UserRound}
              label="Mi perfil"
              subtitle="Página"
              onSelect={() => navigate("/profile")}
            />
            <PaletteLink
              icon={BookOpen}
              label="Documentación API"
              subtitle="Desarrolladores"
              title="Documentación interactiva para probar la API"
              onSelect={() => openExternal("/api/reference")}
            />
            <PaletteLink
              icon={Sparkles}
              label="SKILL"
              subtitle="Desarrolladores"
              onSelect={() => navigate("/skill")}
            />
          </CommandGroup>

          {search.trim() && (
            <>
              <CommandGroup heading="URLs">
                {results.urls.map((url) => (
                  <CommandItem
                    key={url.id}
                    value={url.code + " " + url.url}
                    onSelect={() =>
                      navigate("/urls?search=" + encodeURIComponent(url.code))
                    }
                  >
                    <QrCode />
                    <span className="min-w-0 truncate">
                      {url.code} · {url.url}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      URL
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Usuarios">
                {results.users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.name + " " + user.email}
                    onSelect={() => navigate("/users")}
                  >
                    <Users />
                    <span className="min-w-0 truncate">
                      {user.name} · {user.email}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Usuario
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="API keys">
                {results.api_keys.map((key) => (
                  <CommandItem
                    key={key.id}
                    value={key.name + " " + key.key_prefix}
                    onSelect={() => navigate("/api-keys")}
                  >
                    <KeyRound />
                    <span className="min-w-0 truncate">
                      {key.name} · {key.key_prefix}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Key
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑ ↓ para moverte</span>
          <span>Enter para abrir</span>
          <span>{isMac ? "⌘K" : "Ctrl+K"} abre y cierra</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

function PaletteLink({
  icon: Icon,
  label,
  subtitle,
  title,
  onSelect,
}: {
  icon: typeof House;
  label: string;
  subtitle: string;
  title?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={`${label} ${subtitle}`}
      onSelect={onSelect}
      title={title}
    >
      <Icon />
      <span>{label}</span>
      <span className="ml-auto text-xs text-muted-foreground">{subtitle}</span>
    </CommandItem>
  );
}
