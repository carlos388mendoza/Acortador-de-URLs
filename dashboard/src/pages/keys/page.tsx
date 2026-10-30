import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { KeyRound, Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LIVE_INTERVALS,
  liveQuery,
  refreshEverywhere,
  useNewIds,
} from "@/lib/live";
import { toast } from "sonner";
import { api, apiPatch } from "@/api/client";
import type { ApiKey } from "@/types";
import { errorMessage } from "@/lib/format";
import { LoadingCards } from "@/components/shared/loading-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiKeyCard } from "./key-card";
import { PageHeading } from "@/components/layout/page-heading";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import {
  CreateKeyDialog,
  RenameKeyDialog,
  RevealKeyDialog,
} from "./key-dialogs";

const SORT_OPTIONS = {
  creadas: "Creación: más recientes",
  "creadas-antiguas": "Creación: más antiguas",
  uso: "Último uso: más reciente",
  "uso-antiguo": "Último uso: más antiguo",
} as const;
type SortOption = keyof typeof SORT_OPTIONS;
type StatusFilter = "todas" | "activas" | "inactivas";

const isSortOption = (value: string | null): value is SortOption =>
  value !== null && value in SORT_OPTIONS;
const time = (value: string | null) => (value ? Date.parse(value) : null);

/** Ordena sin mutar. En "último uso" las claves que nunca se usaron van siempre al final. */
function sortKeys(items: ApiKey[], sort: SortOption): ApiKey[] {
  return [...items].sort((a, b) => {
    if (sort === "creadas" || sort === "creadas-antiguas") {
      const diff = Date.parse(b.created_at) - Date.parse(a.created_at);
      return sort === "creadas" ? diff : -diff;
    }
    const usedA = time(a.last_used_at);
    const usedB = time(b.last_used_at);
    if (usedA === null || usedB === null)
      return usedA === usedB ? 0 : usedA === null ? 1 : -1;
    return sort === "uso" ? usedB - usedA : usedA - usedB;
  });
}

export function KeysPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { openNewApiKey?: boolean } | null;
  const [creating, setCreating] = useState(routeState?.openNewApiKey ?? false);
  const [secret, setSecret] = useState("");
  const [renaming, setRenaming] = useState<ApiKey | null>(null);
  const [deactivating, setDeactivating] = useState<ApiKey | null>(null);
  const keys = useQuery({
    queryKey: ["keys"],
    queryFn: () => api<{ data: ApiKey[] }>("/api/admin/api-keys"),
    ...liveQuery(LIVE_INTERVALS.lists),
  });
  // Los filtros viven en la URL para que se mantengan al recargar o compartir el enlace
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const sortParam = params.get("orden");
  const sort: SortOption = isSortOption(sortParam) ? sortParam : "creadas";
  const statusParam = params.get("estado");
  const status: StatusFilter =
    statusParam === "activas" || statusParam === "inactivas"
      ? statusParam
      : "todas";
  const owner = params.get("creador") ?? "todos";
  const updateParam = (name: string, value: string, defaultValue: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === defaultValue) next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    if (!routeState?.openNewApiKey) return;
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, routeState?.openNewApiKey, navigate]);

  useEffect(() => {
    const openCreateDialog = () => setCreating(true);
    window.addEventListener("new-api-key", openCreateDialog);
    return () => window.removeEventListener("new-api-key", openCreateDialog);
  }, []);

  const refresh = () =>
    refreshEverywhere(queryClient, [["keys"], ["stats", "summary"]]);

  const toggleKey = async (apiKey: ApiKey, isActive: boolean) => {
    try {
      await apiPatch(`/api/admin/api-keys/${apiKey.id}`, {
        is_active: isActive,
      });
      toast.success(isActive ? "API key activada" : "API key desactivada");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  };

  const requestKeyToggle = (apiKey: ApiKey, isActive: boolean) => {
    if (isActive) void toggleKey(apiKey, true);
    else setDeactivating(apiKey);
  };

  const showNewSecret = (key: string) => {
    setCreating(false);
    setSecret(key);
    void refresh();
  };

  const allKeys = useMemo(() => keys.data?.data ?? [], [keys.data?.data]);
  const owners = useMemo(
    () =>
      [
        ...new Map(allKeys.map((item) => [item.owner.id, item.owner])).values(),
      ].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [allKeys],
  );
  // Búsqueda y creador se aplican a las dos secciones; el estado decide qué secciones se ven
  const filteredKeys = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortKeys(
      allKeys.filter(
        (item) =>
          (owner === "todos" || String(item.owner.id) === owner) &&
          (!term ||
            `${item.name} ${item.key_prefix}`.toLowerCase().includes(term)),
      ),
      sort,
    );
  }, [allKeys, owner, search, sort]);
  const freshIds = useNewIds(allKeys.map((item) => item.id));
  const activeKeys = filteredKeys.filter((item) => item.is_active);
  const inactiveKeys = filteredKeys.filter((item) => !item.is_active);
  const hasFilters = Boolean(search) || owner !== "todos" || status !== "todas";

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        label="Desarrolladores"
        title="API keys"
        live
        subtitle="Claves para usar la API desde otros sistemas."
        action={
          <Button
            className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCreating(true)}
          >
            <Plus /> Nueva API key
          </Button>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold">
              ¿Cómo uso mi API key?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Inclúyela como Bearer token al crear enlaces.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-950 p-3 text-xs leading-5 text-stone-100">{`curl -X POST https://acortador-de-urls-iota.vercel.app/api/urls/new \\\n  -H 'Authorization: Bearer sk_TU_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"url":"https://ejemplo.com"}'`}</pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a
                href="/api/reference"
                target="_blank"
                rel="noreferrer"
                title="Documentación interactiva para probar la API"
              >
                Documentación API
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/skill">SKILL para agentes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {keys.isPending ? (
        <LoadingCards />
      ) : keys.isLoadingError ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {errorMessage(keys.error)}
          </CardContent>
        </Card>
      ) : keys.data.data.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 p-10">
            <KeyRound className="size-10 text-brand" />
            <h2 className="font-heading text-xl font-bold">No hay API keys</h2>
            <p className="text-sm text-muted-foreground">
              Crea una clave para conectar tus aplicaciones.
            </p>
            <Button onClick={() => setCreating(true)}>Crear API key</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          <Card className="rounded-2xl">
            <CardContent className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(200px,1fr)_auto_auto_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar API keys"
                  placeholder="Buscar por nombre o prefijo..."
                  value={search}
                  onChange={(event) => updateParam("q", event.target.value, "")}
                  className="h-10 rounded-xl pl-9"
                />
              </div>
              <div
                className="flex flex-wrap gap-1 rounded-xl bg-muted p-1"
                role="tablist"
                aria-label="Filtrar por estado"
              >
                {(
                  [
                    ["todas", "Todas", filteredKeys.length],
                    ["activas", "Activas", activeKeys.length],
                    ["inactivas", "Inactivas", inactiveKeys.length],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={status === value}
                    onClick={() => updateParam("estado", value, "todas")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {label} <span className="ml-1 opacity-70">{count}</span>
                  </button>
                ))}
              </div>
              <Select
                value={sort}
                onValueChange={(value) =>
                  updateParam("orden", value, "creadas")
                }
              >
                <SelectTrigger
                  aria-label="Ordenar API keys"
                  className="h-10 w-full rounded-xl lg:w-56"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_OPTIONS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={owner}
                onValueChange={(value) =>
                  updateParam("creador", value, "todos")
                }
              >
                <SelectTrigger
                  aria-label="Filtrar por creador"
                  className="h-10 w-full rounded-xl lg:w-48"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los creadores</SelectItem>
                  {owners.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          {filteredKeys.length === 0 && hasFilters ? (
            <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Ninguna API key coincide con los filtros.
              </p>
              <Button
                variant="outline"
                onClick={() => setParams({}, { replace: true })}
              >
                Quitar filtros
              </Button>
            </div>
          ) : (
            <>
              {status !== "inactivas" && (
                <KeySection
                  title="Activas"
                  active
                  items={activeKeys}
                  freshIds={freshIds}
                  onRename={setRenaming}
                  onToggle={requestKeyToggle}
                />
              )}
              {status !== "activas" && (
                <KeySection
                  title="Inactivas"
                  items={inactiveKeys}
                  freshIds={freshIds}
                  onRename={setRenaming}
                  onToggle={requestKeyToggle}
                />
              )}
            </>
          )}
        </div>
      )}

      {creating && (
        <CreateKeyDialog
          onClose={() => setCreating(false)}
          onCreated={showNewSecret}
        />
      )}
      {secret && (
        <RevealKeyDialog secret={secret} onClose={() => setSecret("")} />
      )}
      {renaming && (
        <RenameKeyDialog
          key={renaming.id}
          apiKey={renaming}
          onClose={() => setRenaming(null)}
          onSaved={() => void refresh()}
        />
      )}
      {deactivating && (
        <ConfirmDeleteDialog
          title={`¿Desactivar “${deactivating.name}”?`}
          description={`API key ${deactivating.key_prefix}`}
          actionLabel="Desactivar"
          icon="deactivate"
          onClose={() => setDeactivating(null)}
          onConfirm={() => toggleKey(deactivating, false)}
        />
      )}
    </div>
  );
}

function KeySection({
  title,
  active = false,
  items,
  freshIds,
  onRename,
  onToggle,
}: {
  title: string;
  active?: boolean;
  items: ApiKey[];
  freshIds: ReadonlySet<number | string>;
  onRename: (item: ApiKey) => void;
  onToggle: (item: ApiKey, isActive: boolean) => void;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-2 font-heading text-xl font-bold">
        <span
          className={`size-2.5 rounded-full ${active ? "bg-green-600" : "bg-stone-400"}`}
        />
        {title}
      </h3>
      {items.length ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ApiKeyCard
              key={item.id}
              apiKey={item}
              isNew={freshIds.has(item.id)}
              onRename={onRename}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No hay API keys {active ? "activas" : "inactivas"}.
        </p>
      )}
    </section>
  );
}
