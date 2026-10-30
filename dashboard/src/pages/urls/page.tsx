import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LIVE_INTERVALS,
  liveQuery,
  refreshEverywhere,
  useNewIds,
} from "@/lib/live";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, QrCode } from "lucide-react";
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
import { PageHeading } from "@/components/layout/page-heading";

export function UrlsPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { openNewUrl?: boolean } | null;
  const [editing, setEditing] = useState<AdminUrl | null | undefined>(() =>
    routeState?.openNewUrl ? null : undefined,
  );
  const [deleting, setDeleting] = useState<AdminUrl | null>(null);
  const [qrUrl, setQrUrl] = useState<AdminUrl | null>(null);
  const queryClient = useQueryClient();
  const page = Number(params.get("page") || "1");
  const search = params.get("search") || "";
  const urls = useQuery({
    queryKey: ["urls", page, search],
    ...liveQuery(LIVE_INTERVALS.lists),
    queryFn: () =>
      api<Page<AdminUrl>>(
        `/api/admin/urls?page=${page}&limit=9&search=${encodeURIComponent(search)}`,
      ),
  });

  // Al cambiar de página o de búsqueda no se animan los resultados: solo lo que aparece solo
  const freshIds = useNewIds(
    urls.data?.data.map((url) => url.id),
    `${page}|${search}`,
  );

  useEffect(() => {
    if (!routeState?.openNewUrl) return;
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, routeState?.openNewUrl, navigate]);

  useEffect(() => {
    const openCreateDialog = () => setEditing(null);
    window.addEventListener("new-url", openCreateDialog);
    return () => window.removeEventListener("new-url", openCreateDialog);
  }, []);

  // Crear, editar o borrar una URL también cambia el resumen, los rankings y las demás pestañas
  const refresh = () => refreshEverywhere(queryClient, [["urls"], ["stats"]]);
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
      throw error;
    }
  };

  return (
    <div className="grid min-w-0 gap-5">
      <PageHeading
        label="Enlaces"
        title="URLs"
        live
        subtitle="Todos los enlaces cortos del equipo."
        action={
          <Button
            className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setEditing(null)}
          >
            <Plus /> Nueva URL
          </Button>
        }
      />

      <Input
        aria-label="Buscar URLs"
        value={search}
        onChange={(event) => updateSearch(event.target.value)}
        placeholder="Buscar por código o URL…"
        className="min-w-0 rounded-xl"
      />

      {urls.isPending ? (
        <LoadingCards />
      ) : urls.isLoadingError ? (
        <Card>
          <CardContent className="p-8 text-center text-destructive">
            {errorMessage(urls.error)}
          </CardContent>
        </Card>
      ) : urls.data.data.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 p-10">
            <QrCode className="size-10 text-muted-foreground" />
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
              isNew={freshIds.has(url.id)}
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
          onQr={(url) => setQrUrl(url)}
        />
      )}
      {deleting && (
        <ConfirmDeleteDialog
          title="¿Eliminar esta URL?"
          description={deleting.short_url}
          actionLabel="Eliminar URL"
          onClose={() => setDeleting(null)}
          onConfirm={deleteUrl}
        />
      )}
      {qrUrl && <QrDialog url={qrUrl} onClose={() => setQrUrl(null)} />}
    </div>
  );
}
