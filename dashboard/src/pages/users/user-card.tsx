import { Calendar, Mail, Pencil, Shield, Trash2 } from "lucide-react";
import type { User } from "@/types";
import { relativeDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function UserCard({
  user,
  onEdit,
  onDelete,
  isCurrent = false,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isCurrent?: boolean;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const admin = user.role === "admin";

  return (
    <Card className="min-w-0 rounded-2xl">
      <CardHeader className="flex-row items-center gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground"
          aria-label={`Iniciales de ${user.name}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{user.name}</CardTitle>
          {isCurrent && (
            <Badge className="mt-1 bg-muted text-muted-foreground">Tú</Badge>
          )}
        </div>
        <Badge
          className={
            admin
              ? "shrink-0 bg-accent text-accent-foreground hover:bg-accent"
              : "shrink-0 bg-muted text-muted-foreground hover:bg-muted"
          }
        >
          <Shield className="mr-1 size-3" />
          {admin ? "Administrador" : "Usuario"}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2">
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate">{user.email}</span>
        </span>
        <span className="flex items-center gap-2">
          <Calendar className="size-3.5" />
          Alta {relativeDate(user.created_at)}
        </span>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1 border-t-0 bg-transparent">
        <Button size="sm" variant="ghost" onClick={() => onEdit(user)}>
          <Pencil /> Editar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={`Eliminar usuario ${user.name}`}
          disabled={isCurrent}
          onClick={() => onDelete(user)}
        >
          <Trash2 /> Eliminar
        </Button>
      </CardFooter>
    </Card>
  );
}
