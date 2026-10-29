import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { KeysPage } from "@/pages/keys/page";
import { LoginPage } from "@/pages/login/page";
import { NotFoundPage } from "@/pages/not-found/page";
import { ProfilePage } from "@/pages/profile/page";
import { StatsPage } from "@/pages/stats/page";
import { AdminPage } from "@/pages/admin/page";
import { UrlsPage } from "@/pages/urls/page";
import { UsersPage } from "@/pages/users/page";
import { ThemeProvider } from "@/components/layout/theme-provider";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<StatsPage />} />
          <Route path="urls" element={<UrlsPage />} />
          <Route path="api-keys" element={<KeysPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
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
