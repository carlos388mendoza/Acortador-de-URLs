import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ApiUserResponse } from "@/types";

export function ProtectedRoute() {
  const session = useQuery({
    queryKey: ["me"],
    queryFn: () => api<ApiUserResponse>("/api/auth/me"),
  });

  if (session.isPending) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Cargando sesión…
      </div>
    );
  }

  if (session.error) return <Navigate to="/login" replace />;
  return <Outlet />;
}
