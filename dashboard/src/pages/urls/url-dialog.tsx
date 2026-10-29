import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/api/client";
import type { AdminUrl, ApiUrlResponse } from "@/types";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UrlDialogProps = {
  url: AdminUrl | null;
  onClose: () => void;
  onSaved: (result: ApiUrlResponse) => void;
  onQr: (url: AdminUrl) => void;
};

export function UrlDialog({ url, onClose, onSaved, onQr }: UrlDialogProps) {
  const [destination, setDestination] = useState(url?.url ?? "");
  const [code, setCode] = useState(url?.code ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<AdminUrl | null>(null);

  const saveUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = url
        ? await apiPatch<ApiUrlResponse>(`/api/admin/urls/${url.id}`, {
            url: destination,
            ...(code !== url.code ? { code } : {}),
          })
        : await apiPost<ApiUrlResponse>("/api/admin/urls", {
            url: destination,
            ...(code ? { code } : {}),
          });
      toast.success(url ? "URL actualizada" : "URL creada");
      onSaved(result);
      if (url) onClose();
      else setCreated(result.admin_url);
    } catch (reason) {
      const message = errorMessage(reason);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.short_url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {created ? (
          <>
            <DialogHeader className="items-center text-center">
              <span className="grid size-12 place-items-center rounded-full bg-green-100 text-green-700">
                <Check className="size-6" />
              </span>
              <DialogTitle className="text-xl font-bold">
                Tu URL está lista
              </DialogTitle>
              <DialogDescription>
                Ya puedes copiarla y compartirla.
              </DialogDescription>
            </DialogHeader>
            <div className="grid justify-items-center gap-4 rounded-2xl bg-muted/60 p-4">
              <p className="max-w-full break-all text-center font-heading text-xl font-bold text-brand">
                {created.short_url}
              </p>
              <div className="flex items-center gap-2">
                <QrPreview url={created.short_url} />
                <div className="grid gap-2">
                  <Button variant="outline" onClick={() => void copy()}>
                    <Copy />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        created.short_url,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    <ExternalLink />
                    Abrir
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose();
                      window.setTimeout(() => onQr(created), 200);
                    }}
                  >
                    <QrCode />
                    Personalizar QR
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                className="w-full bg-[#1c1917] text-white hover:bg-stone-800"
                onClick={onClose}
              >
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="pr-8">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand">
                  <QrCode className="size-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {url ? "Editar URL" : "Crear URL"}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    Escribe el destino y elige un código corto.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={saveUrl}>
              <div className="grid gap-2">
                <Label htmlFor="url-input">URL original</Label>
                <Input
                  id="url-input"
                  type="url"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="https://ejemplo.com/página"
                  required
                  className="h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#e30613]/20"
                />
                {error && !error.toLowerCase().includes("código") && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code-input">
                  Código personalizado (opcional)
                </Label>
                <Input
                  id="code-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={32}
                  placeholder="mi-enlace"
                  className="h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#e30613]/20"
                />
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Tu enlace será: acortador-de-urls-iota.vercel.app/
                  {code || "código automático"}
                </p>
                {error && error.toLowerCase().includes("código") && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1c1917] text-white hover:bg-stone-800"
                >
                  {saving
                    ? "Guardando…"
                    : url
                      ? "Guardar cambios"
                      : "Crear URL"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function QrPreview({ url }: { url: string }) {
  const [markup, setMarkup] = useState("");
  useEffect(() => {
    let active = true;
    void import("qr-code-styling").then(async ({ default: QRCodeStyling }) => {
      const qr = new QRCodeStyling({
        width: 88,
        height: 88,
        type: "svg",
        data: url,
        margin: 1,
        dotsOptions: { color: "#1c1917" },
      });
      const data = await qr.getRawData("svg");
      if (active && data) setMarkup(await data.text());
    });
    return () => {
      active = false;
    };
  }, [url]);
  return (
    <div
      className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
