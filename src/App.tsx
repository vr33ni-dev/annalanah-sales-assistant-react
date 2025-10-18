// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

function StripAuthParamOnce() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("auth")) return;
    params.delete("auth");
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname +
      (newSearch ? "?" + newSearch : "") +
      window.location.hash;
    window.location.replace(newUrl); // full reload so fresh cookies are used
  }, []);
  return null;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <StripAuthParamOnce />
          <Routes>
            {/* PUBLIC login route (no AuthGate, no Layout) */}
            <Route path="/auth/login" element={<Login />} />

            {/* PROTECTED app routes */}
            <Route
              path="/*"
              element={
                <AuthGate fallback={<Login />}>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/sales" element={<SalesProcess />} />
                      <Route path="/contracts" element={<Contracts />} />
                      <Route path="/stages" element={<Stages />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </AuthGate>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
