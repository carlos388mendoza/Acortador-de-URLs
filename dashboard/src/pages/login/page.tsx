import { useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, mocksEnabled } from "@/api/client";
import type { ApiUserResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-[440px] rounded-3xl border-border p-2 shadow-[0_12px_48px_rgb(28_25_23/7%)]">
        <CardHeader className="items-center gap-3 px-6 pb-2 pt-8 text-center">
          <img
            src="/dashboard/logo.png"
            alt="Logo de Acortador de URLs"
            className="size-[140px] rounded-full object-cover"
          />
          <CardTitle className="text-3xl font-bold">
            Acortador de URLs
          </CardTitle>
          <p className="text-base text-muted-foreground">
            Entra con tu correo de trabajo.
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-4">
          <form className="grid gap-5" onSubmit={submit}>
            <div className="grid gap-2">
              <Label htmlFor="login-email">Correo electrónico</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="nombre@grupocomidas.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11 rounded-xl pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl"
              disabled={loading}
            >
              {loading ? <LoaderCircle className="animate-spin" /> : <LogIn />}
              {loading ? "Entrando…" : "Entrar"}
            </Button>
            <Separator />
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              ¿No tienes cuenta o olvidaste tu contraseña? Pide ayuda al
              administrador.
            </p>
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
