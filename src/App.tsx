// App.tsx
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
