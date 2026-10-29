import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Link2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, apiDelete } from "@/api/client";
import type { AdminUrl, Page } from "@/types";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingCards } from "@/components/shared/loading-cards";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { QrDialog } from "./qr-dialog";
import { UrlCard } from "./url-card";
import { UrlDialog } from "./url-dialog";

export function UrlsPage() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<AdminUrl | null | undefined>();
  const [deleting, setDeleting] = useState<AdminUrl | null>(null);
  const [qrUrl, setQrUrl] = useState<AdminUrl | null>(null);
  const queryClient = useQueryClient();
  const page = Number(params.get("page") || "1");
  const search = params.get("search") || "";
  const urls = useQuery({
    queryKey: ["urls", page, search],
    queryFn: () =>
      api<Page<AdminUrl>>(
        `/api/admin/urls?page=${page}&limit=9&search=${encodeURIComponent(search)}`,
      ),
  });

  useEffect(() => {
    const openCreateDialog = () => setEditing(null);
    window.addEventListener("new-url", openCreateDialog);
    return () => window.removeEventListener("new-url", openCreateDialog);
  }, []);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["urls"] });
  const updateSearch = (value: string) =>
    setParams(value ? { search: value, page: "1" } : {});

  const deleteUrl = async () => {
    if (!deleting) return;
    try {
      await apiDelete(`/api/admin/urls/${deleting.id}`);
      toast.success("URL borrada");
      setDeleting(null);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            Enlaces
          </p>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">URLs</h2>
        </div>
        <Button className="h-11 rounded-xl" onClick={() => setEditing(null)}>
          <Plus /> Nueva URL
        </Button>
      </div>

      <Input
        aria-label="Buscar URLs"
        value={search}
        onChange={(event) => updateSearch(event.target.value)}
        placeholder="Buscar por código o URL…"
        className="min-w-0 rounded-xl"
      />

      {urls.isPending ? (
        <LoadingCards />
      ) : urls.error ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {errorMessage(urls.error)}
          </CardContent>
        </Card>
      ) : urls.data.data.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 p-10">
            <Link2 className="size-10 text-muted-foreground" />
            <h2 className="font-semibold">Todavía no hay URLs</h2>
            <p className="text-sm text-muted-foreground">
              Crea tu primer enlace corto.
            </p>
            <Button onClick={() => setEditing(null)}>Crear URL</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {urls.data.data.map((url) => (
            <UrlCard
              key={url.id}
              url={url}
              onEdit={setEditing}
              onDelete={setDeleting}
              onQr={setQrUrl}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() =>
            setParams({ ...(search ? { search } : {}), page: String(page - 1) })
          }
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {Math.max(1, Math.ceil((urls.data?.total ?? 0) / 9))}
        </span>
        <Button
          variant="outline"
          disabled={page * 9 >= (urls.data?.total ?? 0)}
          onClick={() =>
            setParams({ ...(search ? { search } : {}), page: String(page + 1) })
          }
        >
          Siguiente
        </Button>
      </div>

      {editing !== undefined && (
        <UrlDialog
          key={editing?.id ?? "new-url"}
          url={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => void refresh()}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title="¿Borrar esta URL?"
          onClose={() => setDeleting(null)}
          onConfirm={deleteUrl}
        />
      )}
      {qrUrl && <QrDialog url={qrUrl} onClose={() => setQrUrl(null)} />}
    </div>
  );
}
