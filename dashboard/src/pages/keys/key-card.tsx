import {
  Ban,
  Calendar,
  Hash,
  History,
  KeyRound,
  Pencil,
  Power,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { relativeDate } from "@/lib/format";
import type { ApiKey } from "@/types";

export function ApiKeyCard({
  apiKey,
  onRename,
  onToggle,
  isNew = false,
}: {
  apiKey: ApiKey;
  isNew?: boolean;
  onRename: (apiKey: ApiKey) => void;
  onToggle: (apiKey: ApiKey, isActive: boolean) => void;
}) {
  return (
    <Card
      className={`min-w-0 rounded-2xl${isNew ? " live-enter" : ""}`}
      data-live-new={isNew ? "" : undefined}
    >
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <KeyRound className="size-4" />
          </span>
          <CardTitle className="min-w-0 truncate text-base">
            {apiKey.name}
          </CardTitle>
        </div>
        <Badge
          className={
            apiKey.is_active
              ? "shrink-0 bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300"
              : "shrink-0 bg-muted text-muted-foreground hover:bg-muted"
          }
        >
          {apiKey.is_active ? "Activa" : "Inactiva"}
        </Badge>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Hash className="size-3.5" />
            {apiKey.key_prefix}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">{apiKey.owner.name}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <History className="size-3.5" />
            {apiKey.last_used_at ? relativeDate(apiKey.last_used_at) : "Nunca"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3.5" />
            {relativeDate(apiKey.created_at)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1 border-t-0 bg-transparent">
        <Button size="sm" variant="ghost" onClick={() => onRename(apiKey)}>
          <Pencil /> Renombrar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={
            apiKey.is_active ? "text-destructive hover:text-destructive" : ""
          }
          aria-label={
            apiKey.is_active ? "Desactivar API key" : "Activar API key"
          }
          onClick={() => onToggle(apiKey, !apiKey.is_active)}
        >
          {apiKey.is_active ? <Ban /> : <Power />}
          {apiKey.is_active ? "Desactivar" : "Activar"}
        </Button>
      </CardFooter>
    </Card>
  );
}
