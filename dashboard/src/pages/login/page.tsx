import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, mocksEnabled } from "@/api/client";
import type { ApiUserResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const response = await api<ApiUserResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(["me"], response);
      navigate("/", { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo iniciar sesión",
      );
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img
            src="/dashboard/logo.png"
            alt="Logo de Acortador"
            className="mb-3 size-16 rounded-full"
          />
          <CardTitle>Inicia sesión</CardTitle>
          <p className="text-sm text-muted-foreground">
            Entra al panel de administración
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm">
              Correo electrónico
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="grid gap-2 text-sm">
              Contraseña
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
            {mocksEnabled && (
              <p className="text-center text-xs text-muted-foreground">
                Modo de prueba: usa los datos de ejemplo.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
