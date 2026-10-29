import { useState } from "react";
import { KeyRound } from "lucide-react";
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
  const [error, setError] = useState("");

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
      const message = errorMessage(error);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand">
              <KeyRound className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                Nueva API key
              </DialogTitle>
              <DialogDescription className="mt-1">
                La clave completa solo se muestra una vez.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={createKey}>
          <Label htmlFor="key-name">Nombre</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#1c1917] text-white hover:bg-stone-800"
            >
              {saving ? "Creando…" : "Crear API key"}
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
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-brand">
              <KeyRound className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                Renombrar API key
              </DialogTitle>
              <DialogDescription className="mt-1">
                El nombre ayuda a identificar dónde se usa.
              </DialogDescription>
            </div>
          </div>
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
          <Button
            className="bg-[#1c1917] text-white hover:bg-stone-800"
            onClick={() => void save()}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
