import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, apiDelete, apiPatch } from "@/api/client";
import type { ApiKey } from "@/types";
import { errorMessage } from "@/lib/format";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
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
  const [deleting, setDeleting] = useState<ApiKey | null>(null);
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

  const deactivateKey = async () => {
    if (!deleting) return;
    try {
      await apiDelete(`/api/admin/api-keys/${deleting.id}`);
      toast.success("API key desactivada");
      setDeleting(null);
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

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 size-4" /> Nueva API key
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
            <KeyRound className="size-10 text-muted-foreground" />
            <h2 className="font-semibold">No hay API keys</h2>
            <Button onClick={() => setCreating(true)}>Crear API key</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {keys.data.data.map((apiKey) => (
            <ApiKeyCard
              key={apiKey.id}
              apiKey={apiKey}
              onRename={setRenaming}
              onDelete={setDeleting}
              onToggle={(item, active) => void toggleKey(item, active)}
            />
          ))}
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
      {deleting && (
        <ConfirmDeleteDialog
          title="¿Desactivar esta API key?"
          onClose={() => setDeleting(null)}
          onConfirm={deactivateKey}
        />
      )}
    </div>
  );
}
