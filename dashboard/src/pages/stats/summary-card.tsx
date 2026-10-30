import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LiveNumber } from "@/components/shared/live-number";

export function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex min-w-0 items-center justify-between p-5">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold">
            <LiveNumber value={value} />
          </p>
        </div>
        <div className="rounded-2xl bg-accent p-3 text-accent-foreground">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
