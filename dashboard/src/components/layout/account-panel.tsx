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
    <div className="grid gap-3 p-3" aria-label="Cuenta">
      <h2 className="font-heading text-base font-bold">Cuenta</h2>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 p-2.5">
        <Avatar className="size-10">
          <AvatarFallback className="bg-stone-900 font-bold text-white dark:bg-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user?.name ?? "Cuenta"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email} ·{" "}
            {user?.role === "admin" ? "Administrador" : "Usuario"}
          </p>
        </div>
        <Badge className="shrink-0 bg-accent text-accent-foreground hover:bg-accent">
          ✓ Actual
        </Badge>
      </div>
      <Button variant="ghost" className="h-9 justify-start" onClick={onProfile}>
        <UserRound /> Mi perfil
      </Button>
      <div className="grid gap-1.5">
        <p className="text-xs font-semibold">Tema</p>
        <ThemeControl />
      </div>
      <Separator />
      <Button
        variant="ghost"
        className="h-9 justify-start text-destructive hover:text-destructive"
        onClick={onLogout}
      >
        <LogOut /> Cerrar sesión
      </Button>
    </div>
  );
}
