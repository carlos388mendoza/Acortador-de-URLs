import { Copy, ExternalLink, Pencil, QrCode, Trash2 } from "lucide-react";
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
        <CardTitle className="min-w-0 truncate text-base">
          /{url.code}
        </CardTitle>
        <Badge variant="secondary">{url.click_count} clics</Badge>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        <p className="truncate text-sm text-muted-foreground" title={url.url}>
          {url.url}
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
        <p className="text-xs text-muted-foreground">
          Creada {relativeDate(url.created_at)} ·{" "}
          {url.creator?.name ?? "Sin creador"}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void copyShortUrl()}>
          <Copy className="mr-1 size-3" /> Copiar
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label="Generar QR"
          onClick={() => onQr(url)}
        >
          <QrCode className="mr-1 size-3" /> QR
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Editar URL"
          onClick={() => onEdit(url)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Borrar URL"
          onClick={() => onDelete(url)}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
