import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LIVE_INTERVALS, liveQuery, liveRead, useNewIds } from "@/lib/live";
import {
  ChartLine,
  Clock,
  Flame,
  KeyRound,
  MousePointerClick,
  Plus,
  QrCode,
  Trophy,
  Users,
} from "lucide-react";
import { api } from "@/api/client";
import type { AdminUrl, ApiUserResponse, CreatorStat, Summary } from "@/types";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
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
import { PageHeading } from "@/components/layout/page-heading";

type ClickPoint = { date: string; clicks: number };

const chartConfig = {
  clicks: { label: "Clics", color: "var(--brand)" },
} satisfies ChartConfig;

export function StatsPage() {
  const [days, setDays] = useState("7");
  const navigate = useNavigate();
  const createUrl = () => {
    navigate("/urls", { state: { openNewUrl: true } });
  };
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const summary = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => api<Summary>("/api/admin/stats/summary"),
    // El ciclo de 10 s lo lleva la barra lateral (misma consulta): aquí solo se lee
    ...liveRead,
  });
  const clicks = useQuery({
    queryKey: ["stats", "clicks", days],
    ...liveQuery(LIVE_INTERVALS.home),
    queryFn: () =>
      api<{ data: ClickPoint[] }>(
        `/api/admin/stats/clicks-per-day?days=${days}`,
      ),
  });
  const popularUrls = useQuery({
    queryKey: ["stats", "top"],
    ...liveQuery(LIVE_INTERVALS.home),
    queryFn: () =>
      api<{ data: AdminUrl[] }>("/api/admin/stats/top-urls?limit=6"),
  });
  const recentUrls = useQuery({
    queryKey: ["stats", "recent"],
    ...liveQuery(LIVE_INTERVALS.home),
    queryFn: () =>
      api<{ data: AdminUrl[] }>("/api/admin/stats/recent-urls?limit=6"),
  });
  const creators = useQuery({
    queryKey: ["stats", "creators"],
    ...liveQuery(LIVE_INTERVALS.home),
    queryFn: () =>
      api<{ data: CreatorStat[] }>("/api/admin/stats/top-creators?limit=6"),
  });

  const freshRecentIds = useNewIds(recentUrls.data?.data.map((url) => url.id));

  if (summary.isPending) return <LoadingCards />;
  // Solo se muestra el error si nunca hubo datos; un fallo en una actualización automática no borra la pantalla
  if (summary.isLoadingError) {
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
      <PageHeading
        label="General"
        title="Inicio"
        live
        subtitle="Resumen de tus enlaces y su actividad."
        action={
          <Button
            className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={createUrl}
          >
            <Plus />
            Nueva URL
          </Button>
        }
      />
      <section className="relative isolate flex min-h-56 min-w-0 items-center overflow-hidden rounded-3xl bg-brand px-6 py-8 text-white shadow-[0_14px_32px_rgb(227_6_19/18%)] sm:px-9 lg:px-12">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-white/80">
            Hola, {me.data?.user.name ?? "equipo"}
          </p>
          <h2 className="mt-2 max-w-xl font-heading text-3xl font-bold leading-tight sm:text-4xl">
            Acorta, comparte y mide tus enlaces
          </h2>
          <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">
            Administra tus URLs y conoce el alcance de cada enlace.
          </p>
        </div>
        <div className="absolute right-10 hidden size-48 place-items-center rounded-full bg-white shadow-xl lg:grid">
          <img
            src="/dashboard/logo.png"
            alt=""
            className="size-40 rounded-full object-cover"
          />
        </div>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="URLs creadas"
          value={summary.data.total_urls}
          icon={QrCode}
        />
        <SummaryCard
          label="Clics totales"
          value={summary.data.total_clicks}
          icon={MousePointerClick}
        />
        <SummaryCard
          label="Usuarios"
          value={summary.data.total_users}
          icon={Users}
        />
        <SummaryCard
          label="API keys activas"
          value={summary.data.active_api_keys}
          icon={KeyRound}
        />
      </div>

      <Card className="min-w-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartLine className="size-5 text-brand" /> Clics por día
            </CardTitle>
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
          ) : clicks.isLoadingError ? (
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
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-5 text-brand" /> Más populares
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {popularUrls.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : popularUrls.isLoadingError ? (
              <p className="text-sm text-destructive">
                {errorMessage(popularUrls.error)}
              </p>
            ) : popularUrls.data.data.length ? (
              popularUrls.data.data.map((url) => (
                <PopularUrlCard key={url.id} url={url} />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Aún no hay enlaces populares.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-brand" /> Creadas recientemente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentUrls.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : recentUrls.isLoadingError ? (
              <p className="text-sm text-destructive">
                {errorMessage(recentUrls.error)}
              </p>
            ) : recentUrls.data.data.length ? (
              recentUrls.data.data.map((url) => (
                <RecentUrlCard
                  key={url.id}
                  url={url}
                  isNew={freshRecentIds.has(url.id)}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Todavía no hay URLs recientes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-5 text-brand" /> Top creadores
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {creators.isPending ? (
            <Skeleton className="h-28 w-full" />
          ) : creators.isLoadingError ? (
            <p className="text-sm text-destructive">
              {errorMessage(creators.error)}
            </p>
          ) : creators.data.data.length ? (
            creators.data.data.map((creator) => (
              <CreatorCard key={creator.user.id} creator={creator} />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Los creadores aparecerán cuando haya URLs.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
