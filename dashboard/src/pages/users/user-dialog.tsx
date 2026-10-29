import { useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/api/client";
import type { User } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">(user?.role ?? "user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      name,
      email,
      ...(password ? { password } : {}),
      role,
    };

    try {
      if (user) await apiPatch(`/api/admin/users/${user.id}`, body);
      else await apiPost("/api/admin/users", { ...body, password });
      toast.success(user ? "Usuario actualizado" : "Usuario creado");
      onSaved();
      onClose();
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
              <UserRound className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold">
                {user ? "Editar usuario" : "Crear usuario"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Completa los datos de la cuenta.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={saveUser}>
          <Label className="grid gap-2">
            Nombre
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={user ? undefined : 8}
            />
          </Label>
          <Label className="grid gap-2">
            Correo
            <Input
              value={email}
              type="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Label>
          <Label className="grid gap-2">
            Contraseña
            <Input
              value={password}
              type="password"
              onChange={(event) => setPassword(event.target.value)}
              required={!user}
            />
          </Label>
          <Label className="grid gap-2">
            Rol
            <Select
              value={role}
              onValueChange={(value) => setRole(value as "admin" | "user")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </Label>
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
              {saving
                ? "Guardando…"
                : user
                  ? "Guardar cambios"
                  : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
