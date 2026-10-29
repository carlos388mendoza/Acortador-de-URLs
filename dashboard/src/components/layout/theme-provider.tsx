import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("au-theme");
    return saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : "system";
  });

  useEffect(() => {
    const root = document.documentElement;
    const systemPreference = matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      root.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && systemPreference.matches),
      );
    };

    applyTheme();
    localStorage.setItem("au-theme", theme);
    systemPreference.addEventListener("change", applyTheme);
    return () => systemPreference.removeEventListener("change", applyTheme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((current) =>
      current === "light" ? "dark" : current === "dark" ? "system" : "light",
    );
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useDashboardTheme debe usarse dentro de ThemeProvider");
  }
  return context;
}
