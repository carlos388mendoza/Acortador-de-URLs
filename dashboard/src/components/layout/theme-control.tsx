import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "./theme-provider";

export function ThemeControl() {
  const { theme, cycleTheme } = useDashboardTheme();
  const label =
    theme === "system" ? "Sistema" : theme === "dark" ? "Oscuro" : "Claro";

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Cambiar tema"
      onClick={cycleTheme}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
      <span className="ml-2">Tema: {label}</span>
    </Button>
  );
}
