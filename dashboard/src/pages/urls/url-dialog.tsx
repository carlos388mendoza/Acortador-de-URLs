import { useState } from "react";
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
};

export function UrlDialog({ url, onClose, onSaved }: UrlDialogProps) {
  const [destination, setDestination] = useState(url?.url ?? "");
  const [code, setCode] = useState(url?.code ?? "");
  const [saving, setSaving] = useState(false);

  const saveUrl = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

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
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{url ? "Editar URL" : "Crear URL"}</DialogTitle>
          <DialogDescription>
            Introduce la dirección de destino y, si quieres, un código
            personalizado.
          </DialogDescription>
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
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code-input">Código personalizado (opcional)</Label>
            <Input
              id="code-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              maxLength={32}
              placeholder="mi-enlace"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
