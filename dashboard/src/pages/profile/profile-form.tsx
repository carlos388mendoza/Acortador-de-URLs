import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiPatch } from "@/api/client";
import type { User } from "@/types";
import { errorMessage, relativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ user }: { user: User }) {
  const client = useQueryClient();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const refresh = async () => client.invalidateQueries({ queryKey: ["me"] });
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError("");
    const emailChanged = email.toLowerCase() !== user.email.toLowerCase();
    try {
      await apiPatch("/api/auth/me", {
        name,
        email,
        ...(emailChanged ? { current_password: currentPassword } : {}),
      });
      toast.success("Datos guardados");
      await refresh();
      setCurrentPassword("");
    } catch (error) {
      const message = errorMessage(error);
      setProfileError(message);
      toast.error(message);
    }
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }
    try {
      await apiPatch("/api/auth/me", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Contraseña actualizada");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = errorMessage(error);
      setPasswordError(message);
      toast.error(message);
    }
  };

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid min-w-0 gap-5">
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Datos de tu cuenta</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Actualiza tu nombre y correo de acceso.
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Badge className="shrink-0 bg-muted text-muted-foreground">
              <ShieldCheck className="mr-1 size-3" />
              {user.role === "admin" ? "Administrador" : "Usuario"}
            </Badge>
          </div>
          <Button
            form="profile-form"
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Guardar cambios
          </Button>
        </CardHeader>
        <div className="mx-6 h-px bg-border" />
        <CardContent className="pt-5">
          <form
            id="profile-form"
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={saveProfile}
          >
            <Label className="grid gap-2">
              Nombre
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </Label>
            <Label className="grid gap-2">
              Correo
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </Label>
            {email.toLowerCase() !== user.email.toLowerCase() && (
              <Label className="grid gap-2 sm:col-span-2">
                Contraseña actual para cambiar el correo
                <PasswordInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
              </Label>
            )}
            {profileError && (
              <p className="text-sm text-destructive sm:col-span-2">
                {profileError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Cambiar contraseña</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa una contraseña de al menos 8 caracteres.
            </p>
          </div>
          <Button
            form="password-form"
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Actualizar contraseña
          </Button>
        </CardHeader>
        <div className="mx-6 h-px bg-border" />
        <CardContent className="pt-5">
          <form
            id="password-form"
            className="grid gap-4 sm:grid-cols-3"
            onSubmit={savePassword}
          >
            <Label className="grid gap-2">
              Contraseña actual
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
            </Label>
            <Label className="grid gap-2">
              Nueva contraseña
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={8}
              />
            </Label>
            <Label className="grid gap-2">
              Confirmar nueva contraseña
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                minLength={8}
              />
            </Label>
            {passwordError && (
              <p className="text-sm text-destructive sm:col-span-3">
                {passwordError}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Tu sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <UserRound className="size-4 text-muted-foreground" />
            <span>
              Rol:{" "}
              <strong>
                {user.role === "admin" ? "Administrador" : "Usuario"}
              </strong>
            </span>
            <span className="text-muted-foreground">
              Cuenta creada {relativeDate(user.created_at)}
            </span>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => window.dispatchEvent(new Event("request-logout"))}
          >
            <LogOut />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl pr-10"
      />
      <button
        type="button"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
