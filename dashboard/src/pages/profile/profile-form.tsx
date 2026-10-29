import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiPatch } from "@/api/client";
import type { User } from "@/types";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailChanged = email.toLowerCase() !== user.email.toLowerCase();

    try {
      await apiPatch("/api/auth/me", {
        name,
        email,
        ...(emailChanged || newPassword
          ? { current_password: currentPassword }
          : {}),
        ...(newPassword ? { new_password: newPassword } : {}),
      });
      toast.success("Perfil actualizado");
      await client.invalidateQueries({ queryKey: ["me"] });
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Card className="max-w-2xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-2xl">Datos de tu cuenta</CardTitle>
        <p className="text-sm text-muted-foreground">
          Actualiza tu nombre, correo o contraseña.
        </p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={saveProfile}>
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
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Label>
          <Separator />
          <Label>
            Contraseña actual
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
            />
          </Label>
          <Label>
            Nueva contraseña
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </Label>
          <Button type="submit">Guardar cambios</Button>
        </form>
      </CardContent>
    </Card>
  );
}
