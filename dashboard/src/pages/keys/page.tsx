import { useEffect, useState } from "react";
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
import {
  CreateKeyDialog,
  RenameKeyDialog,
  RevealKeyDialog,
} from "./key-dialogs";

export function KeysPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState("");
  const [renaming, setRenaming] = useState<ApiKey | null>(null);
  const keys = useQuery({
    queryKey: ["keys"],
    queryFn: () => api<{ data: ApiKey[] }>("/api/admin/api-keys"),
  });

  useEffect(() => {
    const openCreateDialog = () => setCreating(true);
    window.addEventListener("new-api-key", openCreateDialog);
    return () => window.removeEventListener("new-api-key", openCreateDialog);
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["keys"] });

  const toggleKey = async (apiKey: ApiKey, isActive: boolean) => {
    try {
      await apiPatch(`/api/admin/api-keys/${apiKey.id}`, {
        is_active: isActive,
      });
      toast.success(isActive ? "API key activada" : "API key desactivada");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
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
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Desarrolladores
          </p>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">
            API keys
          </h2>
        </div>
        <Button className="h-11 rounded-xl" onClick={() => setCreating(true)}>
          <Plus /> Nueva API key
        </Button>
      </div>

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
            onToggle={toggleKey}
          />
          <KeySection
            title="Inactivas"
            items={inactiveKeys}
            onRename={setRenaming}
            onToggle={toggleKey}
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
