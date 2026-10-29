import type { AdminUrl } from "@/types";
import { Badge } from "@/components/ui/badge";
import { relativeDate } from "@/lib/format";

export function PopularUrlCard({ url }: { url: AdminUrl }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium">/{url.code}</p>
        <p className="truncate text-xs text-muted-foreground" title={url.url}>
          {url.url}
        </p>
      </div>
      <Badge variant="secondary">{url.click_count} clics</Badge>
    </div>
  );
}

export function RecentUrlCard({ url }: { url: AdminUrl }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium">/{url.code}</p>
        <p className="truncate text-xs text-muted-foreground" title={url.url}>
          {url.url}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {relativeDate(url.created_at)}
      </span>
    </div>
  );
}
