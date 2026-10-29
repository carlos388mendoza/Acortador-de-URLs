import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Link2, Users } from "lucide-react";
import { api } from "@/api/client";
import type { AdminUrl, CreatorStat, Summary } from "@/types";
import { errorMessage } from "@/lib/format";
import { LoadingCards } from "@/components/shared/loading-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CreatorCard } from "./creator-card";
import { PopularUrlCard, RecentUrlCard } from "./stat-url-card";
import { SummaryCard } from "./summary-card";

type ClickPoint = { date: string; clicks: number };

const chartConfig = {
  clicks: { label: "Clics", color: "var(--color-primary)" },
} satisfies ChartConfig;

export function StatsPage() {
  const [days, setDays] = useState("7");
  const summary = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => api<Summary>("/api/admin/stats/summary"),
  });
  const clicks = useQuery({
    queryKey: ["stats", "clicks", days],
    queryFn: () =>
      api<{ data: ClickPoint[] }>(
        `/api/admin/stats/clicks-per-day?days=${days}`,
      ),
  });
  const popularUrls = useQuery({
    queryKey: ["stats", "top"],
    queryFn: () =>
      api<{ data: AdminUrl[] }>("/api/admin/stats/top-urls?limit=6"),
  });
  const recentUrls = useQuery({
    queryKey: ["stats", "recent"],
    queryFn: () =>
      api<{ data: AdminUrl[] }>("/api/admin/stats/recent-urls?limit=6"),
  });
  const creators = useQuery({
    queryKey: ["stats", "creators"],
    queryFn: () =>
      api<{ data: CreatorStat[] }>("/api/admin/stats/top-creators?limit=6"),
  });

  if (summary.isPending) return <LoadingCards />;
  if (summary.error) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          {errorMessage(summary.error)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <h2 className="text-2xl font-bold">¡Hola! 👋</h2>
        <p className="mt-1 text-muted-foreground">
          Aquí tienes el resumen de tu actividad.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="URLs creadas"
          value={summary.data.total_urls}
          icon={Link2}
        />
        <SummaryCard
          label="Clics totales"
          value={summary.data.total_clicks}
          icon={Activity}
        />
        <SummaryCard
          label="Personas"
          value={summary.data.total_users}
          icon={Users}
        />
        <SummaryCard
          label="API keys activas"
          value={summary.data.active_api_keys}
          icon={BarChart3}
        />
      </div>

      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Clics por día</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Actividad en los últimos {days} días
            </p>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger
              className="w-32"
              aria-label="Periodo de estadísticas"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {clicks.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : clicks.error ? (
            <p className="p-6 text-sm text-destructive">
              {errorMessage(clicks.error)}
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart
                data={clicks.data.data}
                margin={{ left: -20, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(value: string) =>
                    new Date(`${value}T00:00:00Z`).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      timeZone: "UTC",
                    })
                  }
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) =>
                        new Date(
                          `${String(value)}T00:00:00Z`,
                        ).toLocaleDateString("es", {
                          dateStyle: "long",
                          timeZone: "UTC",
                        })
                      }
                    />
                  }
                />
                <Area
                  dataKey="clicks"
                  type="monotone"
                  stroke="var(--color-clicks)"
                  fill="var(--color-clicks)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>URLs más populares</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {popularUrls.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : popularUrls.error ? (
              <p className="text-sm text-destructive">
                {errorMessage(popularUrls.error)}
              </p>
            ) : (
              popularUrls.data.data.map((url) => (
                <PopularUrlCard key={url.id} url={url} />
              ))
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>URLs recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentUrls.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : recentUrls.error ? (
              <p className="text-sm text-destructive">
                {errorMessage(recentUrls.error)}
              </p>
            ) : (
              recentUrls.data.data.map((url) => (
                <RecentUrlCard key={url.id} url={url} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top creadores</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {creators.isPending ? (
            <Skeleton className="h-28 w-full" />
          ) : creators.error ? (
            <p className="text-sm text-destructive">
              {errorMessage(creators.error)}
            </p>
          ) : (
            creators.data.data.map((creator) => (
              <CreatorCard key={creator.user.id} creator={creator} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
