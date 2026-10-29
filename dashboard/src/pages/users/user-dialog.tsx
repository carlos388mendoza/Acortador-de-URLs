import { useState } from "react";
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

  const saveUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      toast.error(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Editar usuario" : "Crear usuario"}</DialogTitle>
          <DialogDescription>
            Completa los datos de la cuenta.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={saveUser}>
          <Label>
            Nombre
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Label>
          <Label>
            Correo
            <Input
              value={email}
              type="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Label>
          <Label>
            Contraseña
            <Input
              value={password}
              type="password"
              onChange={(event) => setPassword(event.target.value)}
              required={!user}
            />
          </Label>
          <Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
