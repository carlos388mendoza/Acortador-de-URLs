import { useState } from "react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/api/client";
import type { ApiKey, ApiKeyResponse } from "@/types";
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

type CreateKeyDialogProps = {
  onClose: () => void;
  onCreated: (key: string) => void;
};

export function CreateKeyDialog({ onClose, onCreated }: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiPost<ApiKeyResponse>("/api/admin/api-keys", {
        name,
      });
      toast.success("API key creada");
      onCreated(response.key ?? "");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva API key</DialogTitle>
          <DialogDescription>
            La clave completa solo se muestra una vez.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={createKey}>
          <Label htmlFor="key-name">Nombre</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              Crear key
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RevealKeyDialog({
  secret,
  onClose,
}: {
  secret: string;
  onClose: () => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Copiado");
    } catch {
      toast.error("No se pudo copiar la clave");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copia tu API key</DialogTitle>
          <DialogDescription>
            Guárdala ahora. No volverá a mostrarse.
          </DialogDescription>
        </DialogHeader>
        <code className="block max-w-full break-all p-3">{secret}</code>
        <p className="text-sm text-destructive">
          Por seguridad, el backend no puede recuperarla después.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => void copy()}>
            Copiar
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameKeyDialog({
  apiKey,
  onClose,
  onSaved,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(apiKey.name);
  const save = async () => {
    try {
      await apiPatch(`/api/admin/api-keys/${apiKey.id}`, { name });
      toast.success("API key actualizada");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar API key</DialogTitle>
        </DialogHeader>
        <Label htmlFor="rename-key">Nombre</Label>
        <Input
          id="rename-key"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
