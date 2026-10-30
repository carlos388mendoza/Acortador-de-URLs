import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme, type Theme } from "./theme-provider";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

/** `compact`: solo el ícono, para el pie de la barra lateral donde el espacio es poco. */
export function ThemeControl({ compact = false }: { compact?: boolean }) {
  const { theme, cycleTheme } = useDashboardTheme();
  const current =
    options.find((option) => option.value === theme) ?? options[2];
  const Icon = current.icon;

  if (compact)
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Tema actual: ${current.label}. Cambiar tema`}
        title={`Tema: ${current.label}. Clic para cambiar`}
        onClick={cycleTheme}
        className="size-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
      >
        <Icon className="size-4" />
      </Button>
    );

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={`Tema actual: ${current.label}. Cambiar tema`}
      title={`Tema actual: ${current.label}. Clic para cambiar`}
      onClick={cycleTheme}
      className="h-9 w-full justify-center gap-2 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
    >
      <Icon className="size-4" />
      {current.label}
    </Button>
  );
}
