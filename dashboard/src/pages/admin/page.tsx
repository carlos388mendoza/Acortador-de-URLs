import { KeyRound, Link2, MousePointerClick, Users } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiUserResponse, Summary } from "@/types";
import { LoadingCards } from "@/components/shared/loading-cards";
import { Card, CardContent } from "@/components/ui/card";
import { UsersPage } from "@/pages/users/page";
import { PageHeading } from "@/components/layout/page-heading";

export function AdminPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") === "users" ? "users" : "summary";
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });
  const summary = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: () => api<Summary>("/api/admin/stats/summary"),
    enabled: me.data?.user.role === "admin" && activeTab === "summary",
  });

  if (me.isPending) return <LoadingCards />;
  if (me.data?.user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        label="Equipo"
        title="Administración"
        subtitle="Control general de la aplicación."
      />
      <div
        className="flex gap-6 border-b border-border"
        role="tablist"
        aria-label="Secciones de administración"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "summary"}
          onClick={() => setParams({})}
          className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "summary" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}
        >
          Resumen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "users"}
          onClick={() => setParams({ tab: "users" })}
          className={`border-b-2 px-1 pb-3 text-sm font-semibold ${activeTab === "users" ? "border-brand text-brand" : "border-transparent text-muted-foreground"}`}
        >
          Usuarios
        </button>
      </div>
      {activeTab === "users" ? (
        <UsersPage />
      ) : summary.isPending ? (
        <LoadingCards />
      ) : summary.error ? (
        <Card>
          <CardContent className="p-6 text-destructive">
            No se pudo cargar el resumen de administración.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <AdminCard
            icon={Users}
            title="Usuarios"
            value={summary.data.total_users}
            description="Crear cuentas, cambiar roles y eliminar accesos"
            detail={`${summary.data.total_users} activos`}
            to="/users"
          />
          <AdminCard
            icon={Link2}
            title="URLs"
            value={summary.data.total_urls}
            description="Crear, editar y eliminar enlaces de todo el equipo"
            detail="Enlaces del equipo"
            to="/urls"
          />
          <AdminCard
            icon={KeyRound}
            title="API keys activas"
            value={summary.data.active_api_keys}
            description="Controlar el acceso a la API y ver su último uso"
            detail="Claves activas"
            to="/api-keys"
          />
          <AdminCard
            icon={MousePointerClick}
            title="Clics totales"
            value={summary.data.total_clicks}
            description="Visitas registradas en todos los enlaces"
            detail="Visitas registradas"
            to="/"
          />
        </div>
      )}
    </div>
  );
}

function AdminCard({
  icon: Icon,
  title,
  value,
  detail,
  description,
  to,
}: {
  icon: typeof Users;
  title: string;
  value: number;
  detail: string;
  description: string;
  to: string;
}) {
  return (
    <Link to={to} className="min-w-0 rounded-2xl focus-visible:outline-brand">
      <Card className="h-full rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 font-heading text-3xl font-bold">{value}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {detail}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
