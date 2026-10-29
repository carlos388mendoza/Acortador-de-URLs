import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme, type Theme } from "./theme-provider";

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Automático", icon: Monitor },
];

export function ThemeControl() {
  const { theme, setTheme } = useDashboardTheme();

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
      aria-label="Tema"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Tema ${label}`}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={`h-9 flex-row gap-1 px-1 text-[10px] ${
            theme === value
              ? "bg-card text-foreground shadow-sm hover:bg-card"
              : "text-muted-foreground"
          }`}
        >
          <Icon className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
