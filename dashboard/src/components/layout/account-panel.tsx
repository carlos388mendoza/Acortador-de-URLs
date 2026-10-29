import { LogOut, UserRound } from "lucide-react";
import type { User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeControl } from "./theme-control";

export function AccountPanel({
  user,
  onProfile,
  onLogout,
}: {
  user?: User;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const initials =
    user?.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AU";

  return (
    <div className="grid gap-4 p-4" aria-label="Cuenta">
      <h2 className="font-heading text-lg font-bold">Cuenta</h2>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/60 p-3">
        <Avatar className="size-12">
          <AvatarFallback className="bg-stone-900 font-bold text-white dark:bg-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user?.name ?? "Cuenta"}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.role === "admin" ? "Administrador" : "Usuario"}
          </p>
        </div>
        <Badge className="shrink-0 bg-accent text-accent-foreground hover:bg-accent">
          ✓ Actual
        </Badge>
      </div>
      <Button variant="ghost" className="justify-start" onClick={onProfile}>
        <UserRound /> Mi perfil
      </Button>
      <div className="grid gap-2">
        <p className="text-sm font-semibold">Tema</p>
        <ThemeControl />
      </div>
      <Separator />
      <Button
        variant="ghost"
        className="justify-start text-destructive hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut /> Cerrar sesión
      </Button>
    </div>
  );
}
