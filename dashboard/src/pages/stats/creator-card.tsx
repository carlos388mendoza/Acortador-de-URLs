import type { CreatorStat } from "@/types";
import { LiveNumber } from "@/components/shared/live-number";

export function CreatorCard({ creator }: { creator: CreatorStat }) {
  return (
    <div className="min-w-0 rounded-lg border p-4">
      <p className="truncate font-medium">{creator.user.name}</p>
      <p className="truncate text-sm text-muted-foreground">
        {creator.user.email}
      </p>
      <p className="mt-3 text-sm">
        <LiveNumber value={creator.url_count} /> URLs ·{" "}
        <LiveNumber value={creator.click_count} /> clics
      </p>
    </div>
  );
}
