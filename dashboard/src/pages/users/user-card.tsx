import { Pencil, Trash2 } from "lucide-react";
import type { User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function UserCard({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{user.name}</CardTitle>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant="secondary">{user.role}</Badge>
      </CardHeader>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
          <Pencil className="mr-1 size-3" /> Editar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Borrar usuario"
          onClick={() => onDelete(user)}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
