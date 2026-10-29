import { useEffect, useState } from "react";
import { Command as CommandIcon } from "lucide-react";
import { api } from "@/api/client";
import type { AdminUrl, ApiKey, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDashboardTheme } from "./theme-provider";
import { getVisibleNavItems } from "./nav-items";

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
};

const emptyResults: SearchResults = { urls: [], users: [], api_keys: [] };

/** Reúne navegación y búsqueda del endpoint global documentado en AGENTS.md. */
export function CommandPalette({
  open,
  onOpenChange,
  isMac,
  isAdmin,
  onNavigate,
  onRequestLogout,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const { cycleTheme } = useDashboardTheme();
  const navItems = getVisibleNavItems(isAdmin);

  useEffect(() => {
    const term = search.trim();
    const timer = window.setTimeout(
      () => {
        if (!term) {
          setResults(emptyResults);
          return;
        }

        void api<SearchResults>(
          `/api/admin/search?q=${encodeURIComponent(term)}`,
        )
          .then(setResults)
          .catch(() => setResults(emptyResults));
      },
      term ? 250 : 0,
    );

    return () => window.clearTimeout(timer);
  }, [search]);

  const navigate = (path: string) => {
    onNavigate(path);
    onOpenChange(false);
  };

  const createUrl = () => {
    navigate("/urls");
    window.setTimeout(() => window.dispatchEvent(new Event("new-url")), 100);
  };

  const createApiKey = () => {
    navigate("/api-keys");
    window.setTimeout(
      () => window.dispatchEvent(new Event("new-api-key")),
      100,
    );
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => onOpenChange(true)}
          >
            <CommandIcon className="mr-2 size-4" />
            {isMac ? "⌘" : "Ctrl"} <Kbd className="ml-1">K</Kbd>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Abre la paleta de comandos</TooltipContent>
      </Tooltip>

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Paleta de comandos"
        description="Buscar páginas y acciones"
      >
        <Command>
          <CommandInput
            placeholder="Escribe una página o acción…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No hay resultados.</CommandEmpty>
            <CommandGroup heading="Páginas">
              {navItems.map((item) => (
                <CommandItem
                  key={item.to}
                  value={item.label}
                  onSelect={() => navigate(item.to)}
                >
                  {item.label}
                  <CommandShortcut>Ir</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Acciones">
              <CommandItem onSelect={createUrl}>
                Nueva URL <CommandShortcut>N</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={createApiKey}>Nueva API key</CommandItem>
              <CommandItem onSelect={cycleTheme}>Cambiar tema</CommandItem>
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                  onRequestLogout();
                }}
              >
                Cerrar sesión
              </CommandItem>
            </CommandGroup>
            {search.trim() && (
              <>
                <CommandGroup heading="URLs">
                  {results.urls.map((url) => (
                    <CommandItem
                      key={url.id}
                      value={`${url.code} ${url.url}`}
                      onSelect={() => navigate("/urls")}
                    >
                      {url.code} · {url.url}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Usuarios">
                  {results.users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.name} ${user.email}`}
                      onSelect={() => navigate("/users")}
                    >
                      {user.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Keys">
                  {results.api_keys.map((key) => (
                    <CommandItem
                      key={key.id}
                      value={`${key.name} ${key.key_prefix}`}
                      onSelect={() => navigate("/api-keys")}
                    >
                      {key.name} · {key.key_prefix}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
