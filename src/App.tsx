// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import SalesProcess from "./pages/SalesProcess";
import Contracts from "./pages/Contracts";
import Stages from "./pages/Stages";
import NotFound from "./pages/NotFound";
import AuthGate from "./auth/AuthGate";
import Login from "./pages/Login";
import { useEffect } from "react";

const queryClient = new QueryClient();

/**
 * Wraps the authed area with AuthGate and the app Layout.
 * All routes nested under this element require auth.
 */
function ProtectedShell() {
  return (
    <AuthGate fallback={<Navigate to="/login" replace />}>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGate>
  );
}

const App = () => {
  // Clean up ?auth=... query flag (used after logout)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("auth")) {
      params.delete("auth");
      const newSearch = params.toString();
      const newUrl =
        window.location.pathname +
        (newSearch ? "?" + newSearch : "") +
        window.location.hash;
      window.location.replace(newUrl);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Everything below here is protected */}
            <Route element={<ProtectedShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/sales" element={<SalesProcess />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/stages" element={<Stages />} />
              {/* Protected 404 fallback */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
