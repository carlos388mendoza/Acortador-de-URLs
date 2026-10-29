import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiPatch } from "@/api/client";
import type { ApiKey } from "@/types";
import { errorMessage } from "@/lib/format";
import { LoadingCards } from "@/components/shared/loading-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiKeyCard } from "./key-card";
import { PageHeading } from "@/components/layout/page-heading";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import {
  CreateKeyDialog,
  RenameKeyDialog,
  RevealKeyDialog,
} from "./key-dialogs";

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
  });

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

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["keys"] });
    void queryClient.invalidateQueries({ queryKey: ["stats", "summary"] });
  };

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

  const activeKeys = keys.data?.data.filter((item) => item.is_active) ?? [];
  const inactiveKeys = keys.data?.data.filter((item) => !item.is_active) ?? [];

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        label="Desarrolladores"
        title="API keys"
        subtitle="Claves para usar la API desde otros sistemas."
        action={
          <Button
            className="h-11 rounded-xl bg-[#1c1917] text-white hover:bg-stone-800"
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
      ) : keys.error ? (
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
          <KeySection
            title="Activas"
            active
            items={activeKeys}
            onRename={setRenaming}
            onToggle={requestKeyToggle}
          />
          <KeySection
            title="Inactivas"
            items={inactiveKeys}
            onRename={setRenaming}
            onToggle={requestKeyToggle}
          />
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
  onRename,
  onToggle,
}: {
  title: string;
  active?: boolean;
  items: ApiKey[];
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
