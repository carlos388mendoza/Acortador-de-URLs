import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { LoadingCards } from "@/components/shared/loading-cards";

const KeysPage = lazy(() =>
  import("@/pages/keys/page").then((page) => ({ default: page.KeysPage })),
);
const LoginPage = lazy(() =>
  import("@/pages/login/page").then((page) => ({ default: page.LoginPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/not-found/page").then((page) => ({
    default: page.NotFoundPage,
  })),
);
const ProfilePage = lazy(() =>
  import("@/pages/profile/page").then((page) => ({
    default: page.ProfilePage,
  })),
);
const StatsPage = lazy(() =>
  import("@/pages/stats/page").then((page) => ({ default: page.StatsPage })),
);
const AdminPage = lazy(() =>
  import("@/pages/admin/page").then((page) => ({ default: page.AdminPage })),
);
const UrlsPage = lazy(() =>
  import("@/pages/urls/page").then((page) => ({ default: page.UrlsPage })),
);
const UsersPage = lazy(() =>
  import("@/pages/users/page").then((page) => ({ default: page.UsersPage })),
);
const SkillPage = lazy(() =>
  import("@/pages/skill/page").then((page) => ({ default: page.SkillPage })),
);

const PageFallback = <LoadingCards />;
import { ThemeProvider } from "@/components/layout/theme-provider";

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={PageFallback}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={PageFallback}>
                <StatsPage />
              </Suspense>
            }
          />
          <Route
            path="urls"
            element={
              <Suspense fallback={PageFallback}>
                <UrlsPage />
              </Suspense>
            }
          />
          <Route
            path="api-keys"
            element={
              <Suspense fallback={PageFallback}>
                <KeysPage />
              </Suspense>
            }
          />
          <Route
            path="admin"
            element={
              <Suspense fallback={PageFallback}>
                <AdminPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={PageFallback}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="profile"
            element={
              <Suspense fallback={PageFallback}>
                <ProfilePage />
              </Suspense>
            }
          />
          <Route
            path="skill"
            element={
              <Suspense fallback={PageFallback}>
                <SkillPage />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={PageFallback}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <ThemeProvider>
        <BrowserRouter basename="/dashboard">
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  );
}
