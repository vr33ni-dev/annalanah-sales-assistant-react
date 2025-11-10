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
import { onAuthMessage } from "@/auth/useAuth"; // cross-tab logout listener
import { useMe } from "@/auth/useAuth"; // <-- add this
import NLQConsole from "./pages/NLQConsole";

const queryClient = new QueryClient();

/** Public-only guard: if already authed, bounce to the app */
function PublicOnly({ children }: { children: JSX.Element }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <></>; // or a spinner
  if (me) return <Navigate to="/" replace />;
  return children;
}

/** Wraps the authed area with AuthGate and the app Layout. */
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
  // Clean up helper auth param (e.g., ?auth=logged_out or ?auth=signed_in)
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

  // React to logout from other tabs immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    onAuthMessage(() => {
      try {
        queryClient.clear();
      } catch {
        /* empty */
      }
      if (window.location.pathname !== "/login") {
        window.location.replace("/login?auth=logged_out");
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public-only route: redirects to "/" if already signed in */}
            <Route
              path="/login"
              element={
                <PublicOnly>
                  <Login />
                </PublicOnly>
              }
            />

            {/* Everything below here is protected */}
            <Route element={<ProtectedShell />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/sales" element={<SalesProcess />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/stages" element={<Stages />} />
              {/* 🧠 Natural Language Query Console */}
              <Route path="/nlq" element={<NLQConsole />} />
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
