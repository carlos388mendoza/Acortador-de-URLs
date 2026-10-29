import { useEffect } from "react";
import type { NavigateFunction } from "react-router-dom";

type KeyboardShortcutsOptions = {
  navigate: NavigateFunction;
  openPalette: () => void;
  openHelp: () => void;
  closeDialogs: () => void;
};

/** Registra los atajos globales y omite las letras cuando se escribe en un campo. */
export function useKeyboardShortcuts({
  navigate,
  openPalette,
  openHelp,
  closeDialogs,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    let waitingForDestination = false;
    let destinationTimer = 0;

    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const createUrl = () => {
      navigate("/urls");
      window.setTimeout(() => window.dispatchEvent(new Event("new-url")), 100);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === "Escape") {
        closeDialogs();
        return;
      }

      if (
        isTyping(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === "?") {
        event.preventDefault();
        openHelp();
      } else if (event.key.toLowerCase() === "g") {
        waitingForDestination = true;
        window.clearTimeout(destinationTimer);
        destinationTimer = window.setTimeout(() => {
          waitingForDestination = false;
        }, 900);
      } else if (waitingForDestination) {
        waitingForDestination = false;
        const routes: Record<string, string> = {
          h: "/",
          l: "/urls",
          k: "/api-keys",
          u: "/users",
        };
        const route = routes[event.key.toLowerCase()];
        if (route) navigate(route);
      } else if (event.key === "/") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[aria-label="Buscar URLs"]',
        );
        if (searchInput) searchInput.focus();
        else openPalette();
      } else if (event.key.toLowerCase() === "n") {
        createUrl();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.clearTimeout(destinationTimer);
    };
  }, [navigate, openPalette, openHelp, closeDialogs]);
}
