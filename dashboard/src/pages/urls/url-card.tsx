import {
  Calendar,
  Copy,
  ExternalLink,
  MousePointerClick,
  Pencil,
  QrCode,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminUrl } from "@/types";
import { relativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UrlCardProps = {
  url: AdminUrl;
  onEdit: (url: AdminUrl) => void;
  onDelete: (url: AdminUrl) => void;
  onQr: (url: AdminUrl) => void;
};

export function UrlCard({ url, onEdit, onDelete, onQr }: UrlCardProps) {
  const domain = (() => {
    try {
      return new URL(url.url).hostname;
    } catch {
      return url.url;
    }
  })();
  const copyShortUrl = async () => {
    try {
      await navigator.clipboard.writeText(url.short_url);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar la URL");
    }
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <QrCode className="size-4" />
          </span>
          <CardTitle className="min-w-0 truncate text-base">
            /{url.code}
          </CardTitle>
        </div>
        <Badge className="shrink-0 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
          Activa
        </Badge>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        <p
          className="flex min-w-0 items-center gap-2 truncate text-sm text-muted-foreground"
          title={url.url}
        >
          <ExternalLink className="size-3.5 shrink-0" />
          <span className="truncate">{domain}</span>
        </p>
        <a
          href={url.short_url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center gap-1 truncate text-sm text-primary hover:underline"
        >
          <span className="truncate">{url.short_url}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MousePointerClick className="size-3.5" />
            {url.click_count} clics
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {relativeDate(url.created_at)}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">
              {url.creator?.name ?? "Sin creador"}
            </span>
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1 border-t-0 bg-transparent">
        <Button size="sm" variant="ghost" onClick={() => void copyShortUrl()}>
          <Copy /> Copiar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            window.open(url.short_url, "_blank", "noopener,noreferrer")
          }
        >
          <ExternalLink /> Abrir
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Generar QR"
          onClick={() => onQr(url)}
        >
          <QrCode /> QR
        </Button>
        <Button
          variant="ghost"
          aria-label="Editar URL"
          onClick={() => onEdit(url)}
        >
          <Pencil /> Editar
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label="Borrar URL"
          onClick={() => onDelete(url)}
        >
          <Trash2 /> Eliminar
        </Button>
      </CardFooter>
    </Card>
  );
}
