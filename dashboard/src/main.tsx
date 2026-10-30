import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./index.css";
import App from "./App.tsx";
import { isLiveQuery, liveStatus } from "./lib/live";

const queryClient = new QueryClient({
  // Un fallo de una actualización automática no muestra avisos: se reintenta en el siguiente ciclo
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  queryCache: new QueryCache({
    onSuccess: (_data, query) => {
      if (isLiveQuery(query)) liveStatus.success();
    },
    onError: (_error, query) => {
      if (isLiveQuery(query)) liveStatus.failure();
    },
  }),
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
