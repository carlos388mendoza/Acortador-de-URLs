import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { relativeDate } from "@/lib/format";
import type { ApiKey } from "@/types";

type ApiKeyCardProps = {
  apiKey: ApiKey;
  onRename: (apiKey: ApiKey) => void;
  onDelete: (apiKey: ApiKey) => void;
  onToggle: (apiKey: ApiKey, isActive: boolean) => void;
};

export function ApiKeyCard({
  apiKey,
  onRename,
  onDelete,
  onToggle,
}: ApiKeyCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <CardTitle className="min-w-0 truncate text-base">
          {apiKey.name}
        </CardTitle>
        <Badge variant={apiKey.is_active ? "default" : "secondary"}>
          {apiKey.is_active ? "Activa" : "Inactiva"}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-3">
        <code className="w-fit max-w-full truncate">
          {apiKey.key_prefix}••••••••
        </code>
        <p className="text-sm text-muted-foreground">
          Último uso: {relativeDate(apiKey.last_used_at)}
        </p>
        <p className="text-xs text-muted-foreground">
          Dueño: {apiKey.owner.name}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={apiKey.is_active}
            aria-label="Activar o desactivar API key"
            onCheckedChange={(active) => onToggle(apiKey, active)}
          />
          <Label>Activa</Label>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline" onClick={() => onRename(apiKey)}>
          <Pencil className="mr-1 size-3" /> Renombrar
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Desactivar API key"
          onClick={() => onDelete(apiKey)}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
